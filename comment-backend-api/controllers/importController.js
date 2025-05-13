const fs = require('fs');

const fileDataService = require('../services/fileDataService');
const Comment = require('../models/commentModel');
const Tag = require('../models/tagModel');

require('dotenv').config();

exports.json = async (req, res) => {
    let fileContent;
    try {
        fileContent = fileDataService.getFileContent(req.files);
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ message: err.message });
        }
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
    let data;
    try {
        data = JSON.parse(fileContent);
    } catch (err) {
        console.warn(err);
        return res.status(400).json({ message: "Unable parse JSON from attached file" });
    }

    console.log(data);

    // todo validate JSON
    // todo validate data
    // todo save data

    res.status(200).end();
}