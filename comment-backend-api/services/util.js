exports.rename = (obj, oldKey, newKey) => {
    delete Object.assign(obj, { [newKey]: obj[oldKey] })[oldKey];
};