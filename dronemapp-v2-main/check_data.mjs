import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const [users] = await connection.query('SELECT id, name, openId FROM users');
console.log('Users:', JSON.stringify(users, null, 2));

const [projects] = await connection.query('SELECT id, name, userId FROM projects');
console.log('Projects:', JSON.stringify(projects, null, 2));

await connection.end();
