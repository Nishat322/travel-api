const path = require('path')
const express = require('express')
const xss = require('xss')
const TravelService = require('./travel-service')

const travelRouter = express.Router()
const jsonParser = express.json()

const serializeTravel = place => ({
    id: place.id,
    place: xss(place.place),
    description: xss(place.description),
    author: xss(place.author),
    date_added: place.date_added
})

travelRouter
    .route('/travel')
    .get((req,res,next) => {
        knexInstance = req.app.get('db')
        console.log('GET route')
        TravelService.getAllTravels(knexInstance)
            .then(places => {
                console.log(places)
                res.json(places.map(serializeTravel))
            })
            .catch(next)
    })
    .post(jsonParser, (req,res,next) => {
        const {place, description, author} = req.body
        const newTravel = {place, description}
        const knexInstance = req.app.get('db')

        for (const [key, value] of Object.entries(newTravel))
            if(value == null)
                return res.status(400).json({
                    error: {message: `Missing '${key}' in request body`}
                })

        newTravel.author = author

        TravelService.insertTravel(knexInstance, newTravel)
            .then(place => {
                res.status(201)
                .location(path.posix.join(req.originalUrl,`/${place.id}`))
                .json(place)
            })
            .catch(next)
    })

travelRouter
    .route('/travel/:destination_id')
    .all((req,res,next) => {
        TravelService.getById(
            req.app.get('db'), req.params.destination_id
        )
            .then (place => {
                if(!place) {
                    return res.status(404).json({
                        error: {message: 'Place doesn\'t exist'}
                    })
                }
                res.place = place
                next()
            })
    })
    .get((req,res,next) => {
            res.json({
                id: res.place.id,
                date_added: res.place.date_added,
                place: xss(res.place.place),
                description: xss(res.place.description),
                author: xss(res.place.author)
            })
    })
    .delete((req,res,next) => {
        TravelService.deleteTravel(
            req.app.get('db'), req.params.destination_id
        )
            .then(() => {
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = travelRouter
