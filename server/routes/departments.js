const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const ctrl = require('../controllers/departmentController');

router.use(protect, adminOnly);

// All batches (dropdown helper)
router.get('/batches',                                  ctrl.getAllBatches);
router.get('/batches/:batchId',                         ctrl.getBatchById);

// Departments CRUD
router.get('/',                                         ctrl.getDepartments);
router.post('/',                                        ctrl.createDepartment);
router.get('/:id',                                      ctrl.getDepartment);
router.put('/:id',                                      ctrl.updateDepartment);
router.delete('/:id',                                   ctrl.deleteDepartment);

// Batches (nested under department)
router.get('/:id/batches',                              ctrl.getBatches);
router.post('/:id/batches',                             ctrl.createBatch);
router.get('/:id/batches/:batchId',                     ctrl.getBatch);
router.put('/:id/batches/:batchId',                     ctrl.updateBatch);
router.delete('/:id/batches/:batchId',                  ctrl.deleteBatch);
router.post('/:id/batches/:batchId/regenerate-code',    ctrl.regenerateCode);

module.exports = router;
