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

async function promisify(method, args) {
    return new Promise((resolve, reject) => {
        s3[method](args, (err, data) => {
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
        const response = await promisify('listObjectsV2', {
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
    // const INDEX_HTML_PART = '/index.html';
    const HTML_PART = '.html';

    objects.forEach((item) => {
        if (item.Key.endsWith('/index.html')) {
            // routingRules.push({
            //     Condition: {
            //         HttpErrorCodeReturnedEquals: '404',
            //         KeyPrefixEquals: item.Key.slice(0, -INDEX_HTML_PART.length),
            //     },
            //     Redirect: {
            //         HttpRedirectCode: '302',
            //         ReplaceKeyWith: item.Key,
            //     }
            // });
        } else {
            routingRules.push({
                Condition: {
                    HttpErrorCodeReturnedEquals: '404',
                    KeyPrefixEquals: item.Key.slice(0, -HTML_PART.length),
                },
                Redirect: {
                    HttpRedirectCode: '302',
                    ReplaceKeyWith: item.Key,
                }
            });
        }
    });

    let websiteConfiguration = {
        IndexDocument: {
            Suffix: 'index.html',
        },
    };

    try {
        websiteConfiguration =  await promisify('getBucketWebsite', {
            Bucket: BUCKET_NAME,
        });
    } catch (error) {
        console.error('Failed to load website configuration', error);
    }


    const nextWebsiteConfiguration = _.mergeWith(websiteConfiguration, {
        RoutingRules: routingRules,
    });

    console.log('NEXT_WEBSITE_CONFIGURATION', JSON.stringify(nextWebsiteConfiguration))

    try {
        const response = await promisify('putBucketWebsite', {
            Bucket: BUCKET_NAME,
            WebsiteConfiguration: nextWebsiteConfiguration,
        });

        console.log('RESPONSE', response);
    } catch (error) {
        console.error('Failed to update website configuration', error);
    }
})()

