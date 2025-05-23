const db = require('../db');

class User {
    static async create({ username, email, password }) {
        const result = await db.query(
            `insert into users (username, email, password) values ($1, $2, $3) returning id, username, email`,
            [username, email, password]
        );
        return result.rows[0];
    }

    static async findByEmail(email) {
        const result = await db.query(`select * from users where email = $1`, [email]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query(`select id, username, email from users where id = $1`, [id]);
        return result.rows[0];
    }
}

module.exports = User;