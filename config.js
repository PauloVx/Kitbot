/*Config for kitbot*/

//Heroku Specific Config Vars
module.exports = {
    token: process.env.token,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    prefix: process.env.prefix,
};


//Debug Vars - Do not Make Public
//export const token = 'VALUE';
//export const GOOGLE_API_KEY = 'VALUE';
//export const prefix = 'VALUE';
