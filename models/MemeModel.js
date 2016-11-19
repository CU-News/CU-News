const mongoose = require('mongoose')
const Schema = mongoose.Schema

const memeSchema = new Schema({
	name: {type: String, required: true},
    title: {type: String, required: true},
	uri: {type: String, required: true},
    votes: {type: Number, required: true}
})

const Meme = mongoose.model('Meme', memeSchema, 'Meme')

module.exports = Meme
