const {MongoClient} = require("mongodb");

let client;

const documentURL = "mongodb://fnf_user:fnfpass@localhost:27017/"
const databaseName = "ponto"
const collectionName = "clock"
const pontoBase = {
    username: 'Marcos da Silva',
    matricula: '123456',
}

// quick script to load some sample data into the database
exports.handler = async (event) => {
    console.log('start');

    const database = await initMongoClient(documentURL, databaseName)

    const numberOfDays = 29;
    const month = 2;
    const year = 2024;

    for (let day = 1; day <= numberOfDays; day++) {
        if (isWeekend(year, month, day)) {
            console.log(`Skipping weekend day ${day}`);
            continue;
        }
        const formattedDay = day < 10 ? `0${day}` : day;
        const clockBeginOfDay = await createClockRecord('entrada', '08', year, month, formattedDay, database);
        const clockStartLunch = await createClockRecord('saida', '12', year, month, formattedDay, database);
        const clockEndLunch = await createClockRecord('entrada', '13', year, month, formattedDay, database);
        const clockEndOfDay = await createClockRecord('saida', '17', year, month, formattedDay, database);
    }

    client.close();
    console.log('end');
}

async function createClockRecord(occurenceType, hour, year, month, formattedDay, database) {
    let clock = {
        ...pontoBase,
        ocorrencia: occurenceType,
        timestamp: `${year}-${month}-${formattedDay}T${hour}:00:00`
    }
    console.log(`Saving clock record in DocumentDB: ${JSON.stringify(clock)}`)
    await database.collection(collectionName).insertOne(clock);
    return clock;
}
function isWeekend(year, month, day) {
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

async function initMongoClient(documentURL, databaseName) {
    // Connecting to DocumentDB
    const mongo = new MongoClient(documentURL);
    console.log(`Conectando ao banco de dados`);
    client = await mongo.connect(documentURL);
    return client.db(databaseName);
}



this.handler({}); //TODO remove me after tests