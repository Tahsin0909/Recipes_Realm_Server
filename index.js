const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()
const app = express()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


//middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.uxzfht6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});





async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("RecipesRealm")
        const UserCollection = database.collection('User')
        const RecipesCollection = database.collection('Recipes')
        RecipesCollection.createIndex({ recipeName: "text", recipeDetails: "text", ingredients: "text" });

        // users 
        app.post('/users/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body;
            const query = { email: email }
            const isExist = await UserCollection.findOne(query)
            if (!isExist) {
                const result = await UserCollection.insertOne(user)
                res.send(result)
            }
            else {
                res.send('ALready Have Account')
            }
        })

        app.get('/users', async (req, res) => {
            const cursor = UserCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        // users 

        // recipes 
        app.post('/recipes/:email', async (req, res) => {
            const recipes = req.body;
            const email = req.params.email
            const query = { email: email }
            const isExist = await UserCollection.findOne(query)
            if (isExist) {
                const result = await RecipesCollection.insertOne(recipes)
                res.send(result)
            }
            else {
                res.send('Please Login Or Sign Up First')
            }
        })

        app.get('/recipes', async (req, res) => {
            const cursor = RecipesCollection.find()
            const result = await cursor.toArray()
            const limit = result.length
            const offset = parseInt(req.query.offset)
            // console.log(offset);
            if (limit >= offset) {
                const newResult = result.slice(0, offset)
                res.send(newResult)
            }
            else {
                res.send([...result, { "warning": "No more Data" }])
            }
        })


        // recipes view detail 
        app.put('/recipes/:id', async (req, res) => {
            const Id = req.params.id
            // console.log(Id);
            const data = req.body;
            // console.log(data);
            const query = {
                _id: new ObjectId(Id),
                purchasedBy: data
            }
            const isExist = await RecipesCollection.findOne(query)
            console.log(isExist);
            if (!isExist) {
                const purchasedBy = {
                    $push: {
                        purchasedBy: data
                    }
                }
                const result = await RecipesCollection.updateOne({ _id: new ObjectId(Id) }, purchasedBy)
                const resultWatchCount = await RecipesCollection.updateOne({ _id: new ObjectId(Id) }, { $inc: { watchCount: 1 } })

                const recipesExist = await RecipesCollection.findOne({ _id: new ObjectId(Id) })
                const chefsCoins = await UserCollection.updateOne({ email: recipesExist.creatorEmail }, { $inc: { coin: 1 } })
                const purchasedUserCoins = await UserCollection.updateOne({ email: data.email }, { $inc: { coin: -10 } })
                res.send(result)
            }
            else {
                res.send({ "AlreadyPurchased": true })
            }
        })

        // recepies search 
        app.get('/search', async (req, res) => {
            const searchText = req.query.q;
            console.log(searchText);
            const query = { $text: { $search: searchText } };
            if (!searchText) {
                return res.status(400).send('Search query is required');
            }

            try {
                const results = await RecipesCollection.find(query).toArray();
                res.send(results)
            } catch (error) {
                console.error('Error performing text search:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // recipes suggestion 
        app.get('/suggestion', async (req, res) => {
            const country = req.query.country
            console.log(country);
            const category = req.query.category
            // console.log(offset);

            if (country && !category) {
                const results = await RecipesCollection.find({ country: `${country}` }).toArray();
                res.send(results)
            }
            else if (!country && category) {
                const results = await RecipesCollection.find({ category: `${category}` }).toArray();
                res.send(results)
            }
            else if (country && category) {
                const results = await RecipesCollection.find({ country: `${country}`, category: `${category}` }).toArray();
                res.send(results)
            }
            else {
                res.send({ "filter": false })
            }
        })
        // recipes 






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








app.get('/', async (req, res) => {
    res.send("This is server for Recipes Realm Project @2024")
})
app.listen(port, () => {
    console.log('App listing on PORT:', port)
})