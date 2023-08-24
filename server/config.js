/*
 *  Creating and exporting configuration variables
 *
 */

const environments = {};

//Staging (default)
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging'
};

//Production
environments.production = {
    'httpPort': 9004,
    'httpsPort': 9005,
    'envName': 'production'
};

const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';
const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;