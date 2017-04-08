'use strict';

/**
 * Filters an array of "fields" by label or text value
 * @param {Array} fields
 * @param {String} name
 * @return {Object}
**/
const filterFields = exports.filterFields = (fields, name) => {
  return fields.filter((field) => field.label === name || field.text === name)[0];
}
/**
 * Retrieves the ID for an Item object.
 * @param {Object} item
 * @return {Number}
**/
const getItemID = exports.getItemID = (item) => item.item_id;
/**
 * Retrieves the field ID for an item by field name.
 * @param {Object} item
 * @param {String} name
 * @return {Number}
**/
const getFieldID = exports.getFieldID = (item, name) => {
  return filterFields(item.fields, name).field_id;
}
/**
 * Retrieves the ID for a field value.
 * @param {Array} options
 * @param {String} name
 * @return {Number}
**/
const getFieldValueID = exports.getFieldValueID = (options, value) => {
  return filterFields(options, value).id;
}
/**
 * Provides useful information for the user.
 * @return {String}
**/
const showHelp = exports.showHelp = () => {
  const help = `Show help message.`;
  return help;
}
/**
 * Retrieves the link for the item.
 * @param {Object} item
 * @return {String}
**/
const getURL = exports.getURL = (item) => item.link;
/**
 * Validates the type of response and returns the right value.
 * @param {Object} value
 * @return {Number || String}
**/
const checkValue = exports.checkValue = (value) => {
  return parseInt(value, 10) || value.text || (typeof value === 'object'
    ? JSON.stringify(value)
    : value);
};
