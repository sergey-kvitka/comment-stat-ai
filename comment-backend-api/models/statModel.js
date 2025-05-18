const db = require('../db');

class Stat {
    static async save({ userId, action, type, value = null, amount = 1 }) {
        await db.query( /* sql */ `
            insert into stats (user_id, action, type, value, amount)
            values ($1, $2, $3, $4, $5)
            `, [userId, action, type, value, amount]
        );
    }
}

module.exports = Stat;