const db = require('../db');
const entityMapService = require('../services/entityMapService');

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

    static async findByUsername(username) {
        const result = await db.query(`select * from users where username = $1`, [username]);
        return result.rows[0];
    }

    static async findById(id) {
        const result = await db.query( /* sql */ `
            select u.id, u.username, u.email, c.api_key from users u
            join user_config c on c.user_id = u.id and u.id = $1`,
            [id]
        );
        entityMapService.rename(result.rows[0] ?? {}, 'api_key', 'apiKey');
        return result.rows[0];
    }

    static async findByKeyAPI(key) {
        const result = await db.query( /* sql */ `
            select u.id, u.username, u.email from user_config c
            join users u on c.user_id = u.id and c.api_key = $1
            `, [key]
        );
        return result.rows[0];
    }
}

module.exports = User;