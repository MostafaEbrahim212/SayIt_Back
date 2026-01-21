/**
 * Base Service Class
 * All services should extend this base class for common functionality
 */
class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Find one document by id
   */
  async findById(id, options = {}) {
    const { populate, select } = options;
    let query = this.model.findById(id);
    
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    
    return await query.exec();
  }

  /**
   * Find all documents matching filter
   */
  async find(filter = {}, options = {}) {
    const { populate, select, sort, limit, skip } = options;
    let query = this.model.find(filter);
    
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    if (sort) query = query.sort(sort);
    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    
    return await query.exec();
  }

  /**
   * Find one document matching filter
   */
  async findOne(filter, options = {}) {
    const { populate, select } = options;
    let query = this.model.findOne(filter);
    
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    
    return await query.exec();
  }

  /**
   * Create new document
   */
  async create(data) {
    return await this.model.create(data);
  }

  /**
   * Update document by id
   */
  async updateById(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /**
   * Delete document by id
   */
  async deleteById(id) {
    return await this.model.findByIdAndDelete(id);
  }

  /**
   * Count documents matching filter
   */
  async count(filter = {}) {
    return await this.model.countDocuments(filter);
  }

  /**
   * Check if document exists
   */
  async exists(filter) {
    return !!(await this.model.findOne(filter).select('_id'));
  }
}

module.exports = BaseService;
