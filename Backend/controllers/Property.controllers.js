const propertyModel = require('../models/property.model')
const { validationResult } = require('express-validator')
const propertyService = require('../services/property.service')
const mongoose = require('mongoose')
const DeletedProperty = require('../models/deletedProperty.model')

module.exports.propartyadd = async (req, res, next) => {
    try {
        const error = validationResult(req);

        if (!error.isEmpty()) {
            console.log("this is Controoler")
            return res.status(400).json({ errors: error.array() })
        }

        const { data, company, categories } = req.body;

        if (!company && !categories) {
            return res.status(400).json({ error: 'Property data is required' });
        }
        // const propertyList = await propertyService.createproperty(categories, company, data);
        
        // res.status(201).json(propertyList);
    } catch (error) {
        next(error);
    }

    // add file 
    try {
        const { company, categories } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: 'File is required' });
        }

        // Call the service to process the file
        const propertyList = await propertyService.processExcelFile(file.path, company, categories , data);

        res.status(201).json(propertyList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports.deletePropertiesByIds = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'Id is required' });
        }
        const idArray = id.split(',')
            .map(id => id.trim())
            .filter(id => id)
            .filter(id => /^[0-9a-fA-F]{24}$/.test(id)) // Validate 24 hex chars
            .map(id => new mongoose.Types.ObjectId(id));
        
        console.log("Deleting properties with IDs:", idArray);
        if (idArray.length === 0) {
            return res.status(400).json({ message: 'Valid Ids are required' });
        }

        // Find properties to delete
        const propertiesToDelete = await propertyModel.find({ _id: { $in: idArray } });
        
        // Save deleted properties to DeletedProperty model
        await DeletedProperty.insertMany(propertiesToDelete);

        // Delete properties
        const results = await propertyModel.deleteMany({ _id: { $in: idArray } });
        console.log("Delete results:", results);
        if (results.deletedCount === 0) {
            return res.status(404).json({ message: 'No properties found with the given ids' });
        }
        res.status(200).json({ message: `${results.deletedCount} properties deleted successfully` });
    } catch (error) {
        console.error("Delete error:", error);
        next(error);
    }
};

module.exports.deletePropertiesByDate = async (req, res, next) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Split the date into day, month, year
        const [day, month, year] = date.split('-');
        
        // Create start date (beginning of the day)
        const startDate = new Date(`${year}-${month}-${day}T00:00:00.000+00:00`);
        
        // Create end date (end of the day)
        const endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1);

        console.log('Searching for properties between:', startDate, 'and', endDate);

        // Find properties to delete
        const propertiesToDelete = await propertyModel.find({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        });

        // Save deleted properties to DeletedProperty model
        await DeletedProperty.insertMany(propertiesToDelete);

        const results = await propertyModel.deleteMany({
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        });

        console.log('Delete results:', results);

        if (results.deletedCount === 0) {
            return res.status(404).json({ message: 'No properties found with the given date' });
        }
        res.status(200).json({ message: `${results.deletedCount} properties deleted successfully` });
    } catch (error) {
        console.error('Delete error:', error);
        next(error);
    }
};