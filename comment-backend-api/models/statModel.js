const db = require('../db');
const entityMapService = require('../services/entityMapService');

const mapInPlace = stat => {
    entityMapService.rename(stat, 'user_id', 'userId');
    entityMapService.rename(stat, 'saved_at', 'savedAt');
};

class Stat {
    static async save({ userId, action, type, value = null, amount = 1 }) {
        await db.query( /* sql */ `
            insert into stats (user_id, action, type, value, amount)
            values ($1, $2, $3, $4, $5)
            `, [userId, action, type, value, amount]
        );
    }

    static async findByUser(userId) {
        const result = await db.query( /* sql */ `select * from stats where user_id = $1`, [userId]);
        const stats = result.rows;
        stats.forEach(stat => mapInPlace(stat));
        return stats;
    }
}

module.exports = Stat;