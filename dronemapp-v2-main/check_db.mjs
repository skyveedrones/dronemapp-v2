import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: 'gateway01.us-west-2.prod.aws.tidbcloud.com',
  port: 4000,
  user: 'Hy8Cw8DxLqPZHKq.root',
  database: 'dronemapp_v2',
  ssl: { rejectUnauthorized: true }
});

const [users] = await connection.query('SELECT id, name FROM users');
console.log('Users:', JSON.stringify(users, null, 2));

const [projects] = await connection.query('SELECT id, name, userId FROM projects');
console.log('Projects:', JSON.stringify(projects, null, 2));

await connection.end();
