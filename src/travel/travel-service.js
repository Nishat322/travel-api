const TravelService = {
    getAllTravels(knex) {
        return knex.select('*').from('destinations');
    },

    insertTravel(knex, newTravel) {
        return knex
            .insert(newTravel)
            .into('destinations')
            .returning('*')
            .then(rows => {
                return rows[0]
            })
    },

    getById(knex, id){
        return knex 
            .from('destinations')
            .select('*')
            .where('id', id)
            .first();
    },

    deleteTravel(knex, id){
        return knex('destinations')
            .where('id', id)
            .delete();
    },

    updateTravel(knex, id, newTravelField){
        return knex('destinations')
            .where('id', id)
            .update(newTravelField);
    }
}

module.exports = TravelService