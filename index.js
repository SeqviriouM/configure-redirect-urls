'use strict';

const AWS = require('aws-sdk');
const _ = require('lodash');
const dotEnv = require('dotenv');

dotEnv.config();

const BUCKET_NAME = process.env.BUCKET_NAME || '';

const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    endpoint: 'storage.yandexcloud.net',

});

async function asyncListObjects(args) {
    return new Promise((resolve, reject) => {
        s3.listObjectsV2(args, (err, data) => {
            if (err) {
                return reject(err);
            }

            return resolve(data);
        });
    });
}




(async function () {
    let loadedAllObjects = false;
    const objects = [];
    let nextPageToken = '';

    while (!loadedAllObjects) {
        const response = await asyncListObjects({
            Bucket: 'preprod.cloudil.co.il',
            MaxKeys: 1000,
            ContinuationToken: nextPageToken,
        });


        objects.push(...response.Contents.filter((item) => item.Key.endsWith('.html')));

        if (response.NextContinuationToken) {
            nextPageToken = response.NextContinuationToken;
        } else {
            loadedAllObjects = true;
        }
    }

    console.log('OBJECTS', objects);
})()

