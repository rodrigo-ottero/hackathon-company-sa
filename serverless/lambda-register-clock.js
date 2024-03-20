const { MongoClient } = require('mongodb');
const { decomposeUnverifiedJwt } = require("aws-jwt-verify/jwt");
const moment = require("moment-timezone");
const timezone = 'America/Sao_Paulo'

const documentURL = process.env.DOCUMENTDB_URL
const databaseName= process.env.DATABASE_NAME
const collectionName =  process.env.COLLECTION_NAME

exports.handler = async (event) => {

    let client
    try {

        // Extraction paylod from token
        const { payload } = decomposeUnverifiedJwt(event.headers.Authorization)
        console.log(`Payload: ${JSON.stringify(payload)}`)
        
        // Obtaining employee ID from token payload
        const matricula = payload['custom:matricula'];
        const username = payload['custom:username'];
        
        // Connecting to DocumentDB        
        const mongo = new MongoClient(documentURL);
        console.log(`Connecting to database`)
        client = await mongo.connect(documentURL);
        const database = await client.db(databaseName);
        
        console.log(`Querying current day clock records for this employee`)
        const result = await database.collection(collectionName)
            .find({
                matricula: matricula,
                timestamp: { $regex: `^${moment(new Date().getTime()).tz(timezone).format('YYYY-MM-DD')}` },
            })
            .sort({ timestamp: "desc" })
            .limit(1)
            .toArray();

        const previousClock = result[0];
        console.log(`previousClock: ${JSON.stringify(previousClock)}`)

        // If there are already records for the current day, toggle occurrence between 'entrada' and 'saida'
        let ocorrencia = await previousClock?.ocorrencia === 'entrada' ? 'saida' : 'entrada';
       
        let clock = {
            username: username,
            matricula: matricula,
            ocorrencia: ocorrencia,
            timestamp: moment(new Date().getTime()).tz(timezone).format('YYYY-MM-DDTHH:mm:ss')
        }

        console.log(`Saving clock record in DocumentDB`)
        await database.collection(collectionName).insertOne(clock);

        // Returning success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clock)
        };

    } catch (error) {
        console.error('Error registering clock', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: "Erro ao registrar o ponto." })
        };
    }finally{
        console.log(`Closing connection`)
        client?.close()
    }
};