const admin = require("firebase-admin")

admin.initializeApp({
  credential: admin.credential.cert(require("./source.json")), // path to source db service account
})

const sinkAdmin = admin.initializeApp(
  {
    credential: admin.credential.cert(require("./sink.json")), // path to sink db service account
  },
  "sink"
)

const sourceDB = admin.firestore()
const sinkDB = sinkAdmin.firestore()

module.exports = { sourceDB, sinkDB, admin, sinkAdmin }
