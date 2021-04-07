const {expect} = require('chai')
const knex = require('knex')
const supertest = require('supertest')
const app = require('../src/app')
const {makeTravelArray} = require('./travel.fixtures')

describe('Thoughts Endpoints', function(){
    let db 

    before('make knex connection', () => {
        db = knex ({
            client: 'pg',
            connection: process.env.TEST_DATABASE_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('clean the table', () => db('destinations').truncate())

    afterEach('cleanup', () => db('destinations').truncate())

    describe('GET /api/travel', () => {
        context('Given no destination', () => {
            it('responds with 200 and an empty list', () => {
                return supertest(app)
                    .get('/api/travel')
                    .expect(200, [])
            })
        })
        context('Given there are destinations in the database', () => {
            const testTravel = makeTravelArray()
    
            beforeEach('insert destinations', () => {
                return db   
                    .into('destinations')
                    .insert(testTravel)
            })
    
            it('GET /api/travel responds with 200 and all of the destinations', () => {
                return supertest(app)
                    .get('/api/travel')
                    .expect(200, testTravel)
            })
        })
    })

    describe('GET /api/travel/:destination_id', () => {
        context('Given no destination', () => {
            it('responds with 404', () => {
                const destinationId = 123456
                return supertest(app)
                    .get(`/api/travel/${destinationId}`)
                    .expect(404, {error: {message: 'Place doesn\'t exist'}})
            })
        })

        context('Given there are destinations in the database', () => {
            const testTravel = makeTravelArray()
    
            beforeEach('insert destinations', () => {
                return db   
                    .into('destinations')
                    .insert(testTravel)
            })
    
            it('responds with 200 and the specified thought', () => {
                const destinationId = 2
                const expectedTravel = testTravel[ destinationId -1 ]
                return supertest(app)
                    .get(`/api/travel/${destinationId}`)
                    .expect(200, expectedTravel)
            })
        })

        context('Given an XSS attack thought', () => {
            const maliciousThought = {
                id: 911,
                place: 'Naughty naughty very naughty <script>alert("xss");</script>',
                description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                author: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
                date_added: '2021-04-03T17:28:08.321Z'
            }

            beforeEach('insert malicious thought', () => {
                return db
                    .into('destinations')
                    .insert([maliciousThought])
            })

            it('removes XSS attack content', () => {
                return supertest(app)
                    .get(`/api/travel/${maliciousThought.id}`)
                    .expect(200)
                    .expect(res => {
                        expect(res.body.place).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
                        expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
+                       expect(res.body.author).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
                    })
            })
        }) 
    })

    describe('POST /api/travel', () => {
        it('creates a destination, responding with 201 and the new thought', () => {
            const newTravel = {
                place: 'Test new place',
                description: 'Test new description',
                author: 'new author'
            }

            return supertest(app)
                .post('/api/travel')
                .send(newTravel)
                .expect(201)
                .expect(res => {
                    expect(res.body.place).to.eql(newTravel.place)
                    expect(res.body.description).to.eql(newTravel.description)
                    expect(res.body.author).to.eql(newTravel.author)
                    expect(res.body).to.have.property('id')
                    expect(res.headers.location).to.eql(`/api/travel/${res.body.id}`)
                    const expected = new Date().toLocaleString()
                    const actual = new Date(res.body.date_added).toLocaleString()
                    expect(actual).to.eql(expected)
                })
                .then(postRes => 
                    supertest(app)
                        .get(`/api/travel/${postRes.body.id}`)
                        .expect(postRes.body)
                )
        })

        const requiredFields = ['place', 'description']
        
        requiredFields.forEach(field => {
            const newTravel = {
                place: 'Test new travel',
                description: 'Test new description',
            }

            it(`responds with 400 and an error message when the '${field}' is missing`, () => {
                delete newTravel[field]

                return supertest(app)
                      .post('/api/travel')
                      .send(newTravel)
                      .expect(400, {error: { message: `Missing '${field}' in request body` }})
            })
        })
    })

    describe('DELETE /api/travel/:destination_id', () => {
        context('Given there are destinationss in the database', () => {
            const testTravel = makeTravelArray()

            beforeEach('insert destinations', () => {
                return db 
                    .into('destinations')
                    .insert(testTravel)
            })

            it('responds with 204 and removes the destination', () => {
                const idToRemove = 2
                const expectedThoughts = testTravel.filter(place => place.id !== idToRemove)
                return supertest(app)
                    .delete(`/api/travel/${idToRemove}`)
                    .expect(204)
                    .then(res => 
                        supertest(app)
                            .get('/api/travel')
                            .expect(expectedThoughts)
                    )
            })
        })
        context('Given no thought', () => {
            it('responds with 404', () => {
                const thoughtId = 123456
                return supertest(app)
                    .delete(`/api/travel/${thoughtId}`)
                    .expect(404, {error: {message: 'Place doesn\'t exist'}})
            })
        })
    })
})