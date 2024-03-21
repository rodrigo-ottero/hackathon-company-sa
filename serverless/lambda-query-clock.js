const { MongoClient } = require('mongodb');
const { decomposeUnverifiedJwt } = require("aws-jwt-verify/jwt");
const moment = require("moment-timezone");

const documentURL = process.env.DOCUMENTDB_URL
const databaseName = process.env.DATABASE_NAME
const collectionName = process.env.COLLECTION_NAME

exports.handler = async (event) => {
    let client;

    try {

        // Extraction paylod from token
        const { payload } = decomposeUnverifiedJwt(event.headers.Authorization);
        console.log(`Payload: ${JSON.stringify(payload)}`);

        // Obtaining user data from token payload
        const matricula = payload['custom:matricula'];
        const username = payload['cognito:username'];
        const email = payload['email'];
        const dataInicial = event?.queryStringParameters?.dataInicial;
        const dataFinal = event?.queryStringParameters?.dataFinal;

        // Validating input
        if (!moment(dataInicial, moment.ISO_8601, true).isValid() || !moment(dataFinal, moment.ISO_8601, true).isValid()) {
            // Returning validation error
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: "Parâmetros dataInicial e/ou dataFinal não encontrados ou inválidos (YYYY-MM-DDTHH:mm:ss)" })
            };
        }

        // Connecting to DocumentDB        
        const mongo = new MongoClient(documentURL);
        console.log(`Conectando ao banco de dados`);
        client = await mongo.connect(documentURL);
        const database = client.db(databaseName);

        console.log(`Consultando registros de ponto de ${dataInicial} a ${dataFinal} para o funcionário ${username}`);

        let clocks = await database.collection(collectionName).aggregate([
            {
                // filter by matricula and timestamp interval
                $match: {
                    matricula: matricula,
                    timestamp: {
                        $gte: dataInicial,
                        $lte: dataFinal
                    }
                }
            },
            {
                // group by date
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$timestamp" } } },
                    registros: { $push: "$$ROOT" }
                }
            },
            {
                // add date as key and registros as value
                $replaceRoot: {
                    newRoot: { $arrayToObject: [[{ k: "$_id", v: "$registros" }]] }
                }
            }
        ]).toArray();

        let registros = [];
        let totalHorasTrabalhadas = 0;

        // calculate working hours in daily basis
        clocks.map((registro) => {
            const datas = Object.keys(registro);

            datas.forEach((data) => {
                console.log(`data: ${JSON.stringify(data)}`)

                const ocorrencia = calculateAggragateHoursInSeconds(registro[data]);
                totalHorasTrabalhadas += ocorrencia.horasTrabalhadas;
                registros.push({
                    [data]: {
                        horasTrabalhadas: formatSecondsInHours(ocorrencia.horasTrabalhadas),
                        ocorrencias: ocorrencia.ocorrencias
                    }
                })
            })
        });

        // Returning success response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                matricula: matricula,
                email: email,
                periodo: {
                    dataInicial: dataInicial,
                    dataFinal: dataFinal,
                    totalDiasTrabalhados: registros.length,
                    totalHorasTrabalhadas: formatSecondsInHours(totalHorasTrabalhadas),
                },
                registros: registros
            })
        };
    } catch (error) {
        console.error('Erro ao visualizar registros de ponto', error);
        // Returning error in query data
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: "Erro ao visualizar registros de ponto." })
        };
    } finally {
        if (client) {
            await client.close();
        }
    }
};


const calculateWorkingHoursInSeconds = (entrada, saida) => {
    const diff = moment(saida.timestamp).diff(moment(entrada.timestamp));
    return moment.duration(diff).asSeconds();
};

const calculateAggragateHoursInSeconds = (registrosDoDia) => {
    let totalDuracaoSegundos = 0;
    const ocorrencias = [];

    let entrada = null;

    registrosDoDia.forEach((registro) => {
        if (registro.ocorrencia === 'entrada') {
            entrada = registro;
        } else if (registro.ocorrencia === 'saida' && entrada) {
            const duracaoSegundos = calculateWorkingHoursInSeconds(entrada, registro);
            console.log(`duracaoSegundos: ${duracaoSegundos} -->> entrada: ${entrada.timestamp} registro: ${registro.timestamp}`)
            totalDuracaoSegundos += duracaoSegundos;
            ocorrencias.push(entrada);
            ocorrencias.push(registro);
            entrada = null;
        }
    });

    return { horasTrabalhadas: totalDuracaoSegundos, ocorrencias };
};

const formatSecondsInHours = (totalDuracaoSegundos) => {
    const duracao = moment.duration(totalDuracaoSegundos, 'seconds');
    const horas = duracao.hours().toString().padStart(2, '0');
    const minutos = duracao.minutes().toString().padStart(2, '0');
    const segundos = duracao.seconds().toString().padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
};