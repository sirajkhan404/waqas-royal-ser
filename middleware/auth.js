const jwt = require("jsonwebtoken")
const Users = require("../models/auth")

const verifyToken = (req, res, next) => {

    const authHeader = req.headers.authorization
    const token = authHeader?.split(" ")[1]

    if (!token) { return res.status(401).json({ message: "Unauthorized or access token missing ", isError: true }) }

    jwt.verify(token, process.env.JWT_SECRET, async (error, result) => {
        if (!error) {
            try {
                const user = await Users.findOne({ uid: result.uid }).select("role status")
                if (!user || user.status !== "active") {
                    return res.status(401).json({ message: "Unauthorized or account inactive", isError: true })
                }
                req.uid = result.uid
                req.role = user.role
                next()
            } catch (dbErr) {
                console.error(dbErr)
                res.status(500).json({ message: "Internal server error", isError: true })
            }
        } else {
            console.error(error)
            res.status(401).json({ message: "Unauthorized or user doesn't have access  ", isError: true })
        }
    })

}


module.exports = { verifyToken }