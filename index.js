const { sinkDB, sourceDB, admin, sinkAdmin } = require("./admin")

/**
 * Copy collections
 *
 * @param {Array<String>} sourceCollectionNames Argument 1
 * @param {Array<String>} sinkCollectionNames Argument 2
 */
async function copyCollections(sourceCollectionNames, sinkCollectionNames = []) {
  if (sinkCollectionNames.length == 0) {
    sinkCollectionNames = sourceCollectionNames.map((name) => name.toUpperCase())
  }
  const promises = []
  sourceCollectionNames.forEach((collection, index) => {
    const promise = copyCollection(collection, sinkCollectionNames[index])
    promises.push(promise)
  })

  return Promise.allSettled(promises)
    .then((result) => {
      return result.forEach((res, index) => {
        console.log(
          `${sourceCollectionNames[index]}: ${sinkCollectionNames[index]} ${res.status} --> ${
            res.value || res.reason
          } `
        )
      })
    })
    .catch((err) => {
      console.error(err)
    })
}

/**
 * Copy collection
 *
 * @param {string} sourceCollectionName Argument 1
 * @param {string} sinkCollectionName Argument 2
 */
async function copyCollection(sourceCollectionName, sinkCollectionName) {
  const batch = sinkDB.batch()
  console.log(`starting import`)
  return sourceDB
    .collection(sourceCollectionName)
    .get()
    .then((snap) => {
      snap.docs.forEach((doc) => {
        console.log(`importing ${doc.id}`)
        const sinkRef = sinkDB.collection(sinkCollectionName.toUpperCase()).doc(doc.id)
        batch.set(sinkRef, doc.data())
      })
      return batch.commit()
    })
    .then(() => {
      return `imported successfully`
    })
    .catch((err) => {
      console.error(err)
    })
}

/**
 * sub collection
 *
 * @param {string} sourceCollectionName Argument 1
 * @param {string} sinkCollectionName Argument 2
 * @param {Array<String>} sourceSubCollections Argument 3
 * @param {Array<String>} sinkSubCollections Argument 4
 */

async function copySubCollections(
  sourceCollectionName,
  sinkCollectionName,
  sourceSubCollections,
  sinkSubCollections = []
) {
  const finalPromises = []
  const promises = []

  if (sinkSubCollections.length === 0) {
    sinkSubCollections = sourceSubCollections.map((name) => name.toUpperCase())
  }

  console.log(`starting import`)
  return sourceDB
    .collection(sourceCollectionName)
    .get()
    .then((snap) => {
      return snap.docs.map((doc) => doc.id)
    })
    .then((ids) => {
      ids.forEach((id) => {
        sourceSubCollections.forEach((name, index) => {
          const promise = sourceDB.collection(sourceCollectionName).doc(id).collection(name).get()
          promises.push({ promise, id, name: sinkSubCollections[index] })
        })
      })
      return Promise.all(promises.map((item) => item.promise))
    })
    .then((snaps) => {
      snaps.forEach((snap, index) => {
        const name = promises[index].name
        const id = promises[index].id
        snap.docs.forEach((doc) => {
          console.log(`importing ${id} -> ${name} -> ${doc.id}`)
          const sinkRef = sinkDB
            .collection(sinkCollectionName)
            .doc(id)
            .collection(name.toUpperCase())
            .doc(doc.id)
          const promise = sinkRef.set(doc.data())
          finalPromises.push(promise)
        })
      })
      return Promise.all(finalPromises)
    })
    .then(() => {
      return "imported successfully"
    })
    .catch((err) => {
      console.error(err)
    })
}

async function giveAuthToUsers() {
  return admin
    .auth()
    .listUsers(100)
    .then((listUsersRes) => {
      const promises = []
      listUsersRes.users.forEach((user) => {
        console.log(`for user ${user.uid}`)
        if (user.phoneNumber) {
          const promise = sinkAdmin
            .auth()
            .createUser({ phoneNumber: user.phoneNumber, uid: user.uid })
          promises.push(promise)
        } else if (user.email) {
          const promise = sinkAdmin.auth().createUser({ email: user.email, uid: user.uid })
          promises.push(promise)
        }
      })
      return Promise.allSettled(promises)
    })
    .then((res) => {
      return res.forEach((result) =>
        console.log(`${result.status} --> ${result.value} --> ${result.reason}`)
      )
    })
    .catch((err) => {
      console.error(err)
    })
}

// copyCollections(["Doctors"])

copySubCollections("Doctors", "DOCTORS", ["patients"])
