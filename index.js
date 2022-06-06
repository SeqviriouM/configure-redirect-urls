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
            Bucket: BUCKET_NAME,
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

    const routingRules = [];
    const INDEX_HTML_PART = '/index.html';
    const HTML_PART = '.html';

    console.log('OBJECTS', objects);

    objects.forEach((item) => {
        if (item.Key.endsWith('/index.html')) {
            routingRules.push({
                Condition: {
                    KeyPrefixEquals: item.Key.slice(0, -INDEX_HTML_PART.length),
                },
                Redirect: {
                    ReplaceKeyWith: item.Key,
                }
            });
        } else {
            routingRules.push({
                Condition: {
                    KeyPrefixEquals: item.Key.slice(0, -HTML_PART.length),
                },
                Redirect: {
                    ReplaceKeyWith: item.Key,
                }
            });
        }
    })

    // s3.putBucketWebsite({
    //     WebsiteConfiguration: {
    //         RoutingRules: routingRules,
    //     }
    // })

    console.log('ROUTING_RULES', routingRules);
})()

