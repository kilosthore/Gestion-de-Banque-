const { Compte } = require('./index');
// CarteCredit = même table que Compte (héritage en table unique, colonne `kind`)
module.exports = { Compte, CarteCredit: Compte };
