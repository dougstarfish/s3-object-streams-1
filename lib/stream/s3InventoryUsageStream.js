/**
 * @fileOverview S3InventoryUsageStream class definition.
 */

// Core.
var util = require('util');

// Local.
var S3UsageStream = require('./s3UsageStream');

//---------------------------------------------------------------------------
// Class constructor.
//---------------------------------------------------------------------------

/**
 * @class An object stream for running totals of size and count of S3 objects.
 *
 * Pipe in S3 object definitions obtained from the CSV files generated by the
 * S3 Inventory service. Note that this requires at least the StorageClass and
 * Size optional fields to be specified in the S3 Inventory definition.
 *
 * {
 *   Bucket: 'bucket',
 *   Key: 'folder1/item.txt',
 *   VersionId: 'version-id-hash-string',
 *   // These might be 'TRUE' or 'FALSE' strings.
 *   IsLatest: 'TRUE',
 *   IsDeleteMarker: 'FALSE',
 *   // This can be a numeric string or a number.
 *   Size: '500',
 *   LastModifiedDate: '2016-11-22T15:24:09.000Z',
 *   ETag: 'etag-hash-string',
 *   // In addition to the normal values, this will be an empty string if
 *   // IsDeleteMarker is TRUE.
 *   StorageClass: 'STANDARD',
 *   // Again, 'TRUE' or 'FALSE'.
 *   IsMultipartUploaded: 'FALSE'.
 *   // Usually an empty string.
 *   ReplicationStatus: ''
 * }
 *
 * All versions are counted towards the total. Deletion markers are ignored.
 *
 * Pipe out running total objects with counts and size grouped by bucket and key
 * prefix:
 *
 * [
 *   {
 *     path: 'bucket/folder1',
 *     storageClass: {
 *       STANDARD: {
 *         // Number of objects counted so far.
 *         count: 55,
 *         // Total size of all objects counted so far in bytes.
 *         size: 1232983
 *       },
 *       STANDARD_IA: {
 *         count: 0,
 *         size: 0
 *       },
 *       REDUCED_REDUNDANCY: {
 *         count: 2,
 *         size: 5638
 *       },
 *       GLACIER: {
 *         count: 0,
 *         size: 0
 *       }
 *     }
 *   }
 *   ,
 * ]
 *
 * @param {Object} options Standard stream options, plus those noted.
 * @param {Object} [options.delimiter] How to split keys into folders. Defaults
 *   to '/',
 * @param {Object} [options.depth] Depth of folders to group count and size.
 *   Defaults to 0, or no folders, just buckets.
 * @param {Number} [options.outputFactor] At 1, send an update for every object.
 *   At 10, only once every 10 objects. Defaults to 100. Updating is expensive
 *   for very large buckets or depths.
 */
function S3InventoryUsageStream (options) {
  S3InventoryUsageStream.super_.call(this, options);
}

util.inherits(S3InventoryUsageStream, S3UsageStream);

//---------------------------------------------------------------------------
// Methods
//---------------------------------------------------------------------------

/**
 * Implementation of the necessary transform method.
 *
 * @param {Object} data An S3 Inventory object definition.
 * @param {String} encoding Irrelevant since this is an object stream.
 * @param {Function} callback Invoked after this listing is processed.
 */
S3InventoryUsageStream.prototype._transform = function (data, encoding, callback) {
  if (!data) {
    return callback(new Error('Invalid S3 Inventory object definition provided: ' + JSON.stringify(data)));
  }

  // Assume we're probably going to be getting objects parsed from a CSV file,
  // and thus all values are probably going to be strings, or empty strings if
  // missing.
  //
  // Skip if this is a deletion marker or some other non-file entity with an
  // empty StorageClass field.
  if (data.IsDeleteMarker === 'TRUE' || data.StorageClass === ''
  ) {
    return callback();
  }

  // Convert the size if not already converted.
  if (typeof data.Size === 'string') {
    try {
      data.Size = parseInt(data.Size, 10);
    }
    catch (error) {
      return callback(new Error('Invalid S3 Inventory object Size property: ' + JSON.stringify(data)));
    }
  }

  S3InventoryUsageStream.super_.prototype._transform.call(
    this,
    data,
    encoding,
    callback
  );
};

//---------------------------------------------------------------------------
// Export class constructor.
//---------------------------------------------------------------------------

module.exports = S3InventoryUsageStream;

