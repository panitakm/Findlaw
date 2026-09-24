const mysql = require('mysql2/promise');

async function run() {
    const conn = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'lawyer_service_db' });
    await conn.query("UPDATE lawyers SET office_address = REPLACE(office_address, 'บ้านเลขที่ ', '')");
    await conn.query("UPDATE lawyers SET office_address = REPLACE(office_address, 'ตำบล/แขวง ', '')");
    await conn.query("UPDATE lawyers SET office_address = REPLACE(office_address, 'อำเภอ/เขต ', '')");
    await conn.query("UPDATE lawyers SET office_address = REPLACE(office_address, 'จังหวัด ', '')");
    console.log('Done updating addresses');
    process.exit(0);
}

run();
