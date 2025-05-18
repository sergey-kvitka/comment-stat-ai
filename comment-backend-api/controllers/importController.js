const fileDataService = require('../services/fileDataService');
const Comment = require('../models/commentModel');
const Tag = require('../models/tagModel');

require('dotenv').config();

exports.json = async (req, res) => {
    let fileContent;
    try {
        fileContent = fileDataService.getFileContent([req.file]);
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

    const userId = req.user.id;
    const comments = data.map(comment => {
        const {
            createdStr,
            modifiedStr,
            tags,
            ...saveInfo
        } = comment;
        return {
            ...saveInfo,
            userId: userId,
            text: (comment.text ?? "").trim(),
        };
    });
    await Comment.saveAll(comments);

    // todo hangle tags

    res.status(200).end();
};

exports.txt = async (req, res) => {
    let fileContent;
    try {
        fileContent = fileDataService.getFileContent([req.file]);
    } catch (err) {
        if (err.status === 400) {
            return res.status(400).json({ message: err.message });
        }
        console.error(err);
        return res.status(500).json({ message: err.message });
    }

    const userId = req.user.id;
    const comments = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => ({
            userId: userId,
            text: line, // only comments' text is handled on TXT import
        }))
        ;
    await Comment.saveAll(comments);

    res.status(200).end();
};