import db from "../models/index.js";
import { successResponse, errorResponse, uniqueId } from "../helpers/index.js";
import { Sequelize, Op } from "sequelize";
import { getSupplierID, getUserID, getUserName } from "../utils/auth.js";
import { getOutsQtyEachPOSKU } from "../utils/checker.js";
import e from "express";
import { filterDoubleFind, filterDoubleFindCount } from "../utils/filter.js";

export const SupplierScheduleList = async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    const userId = getUserID(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }
    const supplierId = getSupplierID(req);
    const whereClause = {
      [Op.and]: [
        { deleted_at: null },
        { [Op.or]: [{ flag_status: "E" }, { flag_status: "X" }] },
        { is_split: false },
        { is_edit: false },
      ],
    };
    if (supplierId) {
      whereClause[Op.and].push({ supplier_id: supplierId });
    } 

    const data = await db.OFFERS.findAndCountAll({
      include: [
        {
          model: db.USERS,
          as: "crtd_by",
          attributes: ["id", "name"],
        },
        {
          model: db.SUPPLIERS,
          as: "supplier",
          attributes: ["id", "ref_id", "name"],
        },
      ],
      where: whereClause,
      order: [
        ["flag_status", "ASC"],
        ["po_number", "ASC"],
        ["sku_code", "ASC"],
        ["est_delivery", "ASC"],
      ],
    });
    const { dataFilter, countFilter } = filterDoubleFindCount(data);
    return successResponse(req, res, {
      offer: dataFilter,
      total: countFilter.length,
    });
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleCreate = async (req, res) => {
  try {
    // // const supplier_id_params = req.params.supplier_id;
    // const { name, site_ids, supplier_id } = req.body.rq_body;
    // try {
    //   const userId = getUserID(req);
    //   if (!userId) {
    //     return errorResponse(req, res, "User not authorized");
    //   }
    //   const payloadSuppliers = { name, supplier_id, created_at: new Date() };

    //   //check if supplier_id is exist in table
    //   const checkSupplierId = await db.SUPPLIERS.findOne({
    //     where: {
    //       deleted_at: null,
    //       supplier_id,
    //     },
    //   });
    //   if (checkSupplierId) {
    //     return errorResponse(req, res, "Supplier ID is already exist");
    //   }

    //   const createTable = await db.SUPPLIERS.create(payloadSuppliers, {
    //     fields: ["name", "supplier_id", "created_at"],
    //     raw: true,
    //   });
    //   //create data to table supplier_site by looping of object site_ids
    //   const payloadSupplierSite = site_ids.map((item) => {
    //     return {
    //       supplier_id: createTable.id,
    //       name: item.name,
    //       commodity_id: item.commodity_id,
    //       site_id: item.site_id,
    //       created_at: new Date(),
    //       updated_at: new Date(),
    //     };
    //   });
    //   const createTableSite = await db.SUPPLIER_SITE.create(payloadSupplierSite);

    return successResponse(req, res, {
      message: "Success create data Supplier",
    });
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleGet = async (req, res) => {
  // const { supplier_id } = req.params;
  try {
    // const userId = getUserID(req);
    // if (!userId) {
    //   return errorResponse(req, res, "User not authorized");
    // }
    // const data = await db.SUPPLIERS.findOne({
    //   attributes: [
    //     "id",
    //     "supplier_id",
    //     "name",
    //     "created_at",
    //     "updated_at",
    //     "updated_by_id",
    //   ],
    //   include: [
    //     {
    //       model: db.USERS,
    //       as: "crtd_by",
    //       attributes: ["name", "created_at"],
    //     },
    //     {
    //       model: db.SUPPLIER_SITE,
    //       as: "site_ids",
    //       attributes: [
    //         "id",
    //         "supplier_id",
    //         "commodity_id",
    //         "site_id",
    //         "created_at",
    //         "created_by_id",
    //         "updated_at",
    //         "updated_by_id",
    //       ],
    //     },
    //   ],
    //   where: {
    //     supplier_id,
    //   },
    // });
    return successResponse(req, res, data);
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleGetPOQtyAndDate = async (req, res) => {
  try {
    const { po_number, sku_code } = req.query;
    const userId = getUserID(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }
    const data = await db.OFFERS.findAll({
      include: [
        {
          model: db.USERS,
          as: "crtd_by",
          attributes: ["id", "name"],
        },
        {
          model: db.SUPPLIERS,
          as: "supplier",
          attributes: ["id", "ref_id", "name"],
        },
      ],

      where: {
        po_number,
        sku_code,
        deleted_at: null,
      },
      order: [["est_delivery", "ASC"]],
    });

    const uniqueData = filterDoubleFind(data);
    return successResponse(req, res, uniqueData);
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleEdit = async (req, res) => {
  const dbTransaction = await db.sequelize.transaction();
  try {
    const id = req.params.id;
    const { ori_schedules, schedules } = req.body.rq_body;

    const userId = getUserID(req);
    const userName = getUserName(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }

    const checkTotalEqual = schedules.reduce((total, obj) => {
      return total + Number(obj.qty_delivery);
    }, 0);
    const checkTotalEqualOri = ori_schedules.reduce((total, obj) => {
      return total + Number(obj.qty_delivery);
    }, 0);

    if (checkTotalEqual > checkTotalEqualOri) {
      return errorResponse(
        req,
        res,
        "Jumlah quantity melebihi quantity yang ada di jadwal pengiriman, silahkan cek kembali"
      );
    } else if (checkTotalEqual < checkTotalEqualOri) {
      return errorResponse(
        req,
        res,
        "Jumlah quantity kurang dari quantity yang ada di jadwal pengiriman, silahkan cek kembali"
      );
    }

    for (let key in schedules) {
      if (schedules[key].flag_status == "E") {
        //original schedule

        await Promise.all([
          await db.OFFERS.update(
            {
              is_edit: true,
              updated_by_id: userId,
              updated_at: new Date(),
            },
            {
              where: { id: schedules[key].id },
            },
            { dbTransaction }
          ),
          await db.OFFERS.create(
            {
              po_number: schedules[key].po_number,
              supplier_id: parseInt(schedules[key].supplier_id),
              submission_date: new Date(schedules[key].submission_date),
              po_qty: parseInt(schedules[key].po_qty),
              po_outs: parseInt(schedules[key].po_outs),
              sku_code: schedules[key].sku_code,
              sku_name: schedules[key].sku_name,
              notes: JSON.stringify({
                edit_req_sup: schedules[key].notes,
                updated_by: userName,
                updated_at: new Date(),
              }),
              est_delivery: new Date(
                ori_schedules.find(
                  (x) => x.id == schedules[key].id
                )?.est_delivery
              ),
              qty_delivery: ori_schedules.find((x) => x.id == schedules[key].id)
                ?.qty_delivery,
              est_submitted_date: new Date(schedules[key].est_delivery),
              submitted_qty: schedules[key].qty_delivery,
              flag_status: "F",
              is_edit: false,
              edit_from_id: schedules[key].id,
              created_by_id: schedules[key].created_by_id,
              created_at: new Date(),
              updated_by_id: userId,
              updated_at: new Date(),
            },
            { dbTransaction }
          ),
        ]);
      }
    }

    await dbTransaction.commit();
    return successResponse(req, res, "Success Insert Data Jadwal Pengiriman");
  } catch (error) {
    await dbTransaction.rollback();
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleSplitSupplier = async (req, res) => {
  const dbTransaction = await db.sequelize.transaction();
  try {
    const offer_id = req.params.id;
    const { schedules } = req.body.rq_body;

    const userId = getUserID(req);
    const userName = getUserName(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }
    const offerToSplitted = await db.OFFERS.findOne({
      where: { id: offer_id, deleted_at: null },
      attributes: {
        exclude: ["id"],
      },
    });

    const totalQuantitySplitted = schedules.reduce((total, obj) => {
      return total + Number(obj.qty_delivery);
    }, 0);

    if (
      parseInt(totalQuantitySplitted) != parseInt(offerToSplitted.qty_delivery)
    ) {
      return errorResponse(
        req,
        res,
        "Jumlah quantity yang di split tidak sama dengan quantity yang ada di jadwal pengiriman, silahkan cek kembali"
      );
    }

    if (schedules.length == 1) {
      return errorResponse(
        req,
        res,
        "Splitting tidak dapat dilakukan karena hanya ada 1 jadwal pengiriman, gunakan tombol edit"
      );
    }

    for (let key in schedules) {
      //create
      let payloadForSplittedSchedule;
      if (schedules[key].split_from_id == null) {
        payloadForSplittedSchedule = {
          ...offerToSplitted.dataValues,

          est_submitted_date: new Date(schedules[key].est_delivery),
          submitted_qty: schedules[key].qty_delivery,
          split_from_id: offer_id,
          notes: JSON.stringify({
            split_req_sup: schedules[key].notes,
            updated_by: userName,
            updated_at: new Date(),
          }),
          flag_status: "F",
        };
      } else {
        payloadForSplittedSchedule = {
          ...offerToSplitted.dataValues,
          qty_delivery: schedules[key].qty_delivery,
          est_delivery: new Date(schedules[key].est_delivery),
          est_submitted_date: new Date(schedules[key].est_delivery),
          submitted_qty: schedules[key].qty_delivery,
          notes: JSON.stringify({
            split_req_sup: schedules[key].notes,
            updated_by: userName,
            updated_at: new Date(),
          }),
          split_from_id: schedules[key].split_from_id,
          flag_status: "F",
        };
      }
      await db.OFFERS.create(payloadForSplittedSchedule, { dbTransaction });
    }

    //update original schedule
    const payloadForOriginalSchedule = {
      ...offerToSplitted.dataValues,
      is_split: true,
    };
    await db.OFFERS.update(
      payloadForOriginalSchedule,
      {
        where: { id: offer_id },
      },
      { dbTransaction }
    );

    await dbTransaction.commit();

    return successResponse(req, res, "Schedule splitted");
  } catch (error) {
    await dbTransaction.rollback();

    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleConfirm = async (req, res) => {
  const dbTransaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { mass } = req.query;
    const userId = getUserID(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }
    if (mass == "true") {
      //find the flag_status E and is_split false
      const getData = await db.OFFERS.findOne({
        where: {
          id,
        },
      });
      const getAnotherIfExist = await db.OFFERS.findAll({
        where: {
          supplier_id: getData.supplier_id,
          po_number: getData.po_number,
          sku_code: getData.sku_code,
          flag_status: "E",
          is_split: false,
        },
      });

      for (let key in getAnotherIfExist) {
        await db.OFFERS.update(
          {
            flag_status: "X",
            est_submitted_date: getAnotherIfExist[key].est_delivery,
            submitted_qty: getAnotherIfExist[key].qty_delivery,
            updated_at: new Date(),
            updated_by_id: userId,
          },
          {
            where: { id: getAnotherIfExist[key].id },
          },
          { dbTransaction }
        );
      }
    } else {
      const qtyData = await db.OFFERS.findOne({
        where: { id, deleted_at: null },
        attributes: ["qty_delivery", "est_delivery"],
      });

      await db.OFFERS.update(
        {
          submitted_qty: qtyData.qty_delivery,
          est_submitted_date: qtyData.est_delivery,
          flag_status: "X",
          updated_at: new Date(),
          updated_by_id: userId,
        },
        {
          where: { id },
        },
        { dbTransaction }
      );
    }

    await dbTransaction.commit();
    return successResponse(req, res, "Success Insert Data Jadwal Pengiriman");
  } catch (error) {
    await dbTransaction.rollback();
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleConfirmSelectedData = async (req, res) => {
  const dbTransaction = await db.sequelize.transaction();
  try {
    const { schedules } = req.body.rq_body;
    const userId = getUserID(req);
    if (!userId) {
      return errorResponseUnauthorized(
        req,
        res,
        "User belum terautentikasi, silahkan login kembali"
      );
    }
    for (let key in schedules) {
      await db.OFFERS.update(
        {
          submitted_qty: schedules[key].qty_delivery,
          est_submitted_date: schedules[key].est_delivery,
          flag_status: "X",
          updated_at: new Date(),
          updated_by_id: userId,
        },
        {
          where: { id: schedules[key].id },
        },
        { dbTransaction }
      );
    }

    await dbTransaction.commit();
    return successResponse(req, res, "Success Insert Data Jadwal Pengiriman");
  } catch (error) {
    await dbTransaction.rollback();
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleHistory = async (req, res) => {
  const supplier_id = req.params.supplier_id;

  try {
    const userId = getUserID(req);
    if (!userId) {
      return errorResponse(req, res, "User not authorized");
    }
    const supplierId = await db.SUPPLIERS.findOne({
      attributes: ["id"],
      where: {
        deleted_at: null,
        supplier_id,
      },
    });

    let supplierInfoData;

    let supplierPerId = await db.SUPPLIERS.findOne({
      attributes: [
        "id",
        "supplier_id",
        "name",
        "created_at",
        "updated_at",
        "updated_by_id",
      ],
      where: {
        deleted_at: null,
        id: supplierId.id,
      },
      include: [
        {
          model: db.USERS,
          as: "crtd_by",
          attributes: ["name", "created_at"],
        },
      ],
    });

    const supplierHistory = await history(db, supplierPerId.id);

    if (supplierPerId == null) {
    } else {
      supplierPerId.dataValues.price_avg =
        supplierHistory[0]?.price_avg == null
          ? 0
          : Number(supplierHistory[0].price_avg).toFixed(2) + "";

      supplierPerId.dataValues.total_trn =
        supplierHistory[0]?.total_trn == null
          ? 0
          : supplierHistory[0].total_trn;

      supplierPerId.dataValues.count_otif =
        supplierHistory[0]?.count_otif == null
          ? 0
          : supplierHistory[0].count_otif;

      supplierPerId.dataValues.count_not_otif =
        supplierHistory[0]?.total_trn - supplierHistory[0]?.count_otif;

      supplierPerId.dataValues.otif_percentage =
        (
          (supplierHistory[0]?.total_trn / supplierHistory[0]?.count_otif) *
          100
        ).toFixed(2) + "";

      supplierPerId.dataValues.recent_transactions = [];

      supplierInfoData = supplierPerId.dataValues;
    }
    const idSupplier = supplierPerId.id;
    const transactions = await db.trns.findAndCountAll({
      attributes: [
        "id",
        "datetime",
        "delivered_datetime",
        "handover_date",
        "is_otif",
      ],
      include: [
        {
          model: db.OFFERS,
          as: "offer",
          attributes: {
            include: [
              ["risk_mgmt_price_recommendation", "risk_mgmt_price_rec"],
            ],
            exclude: ["risk_mgmt_price_recommendation"],
          },
          where: {
            supplier_id: idSupplier,
            [Op.not]: [{ transaction_id: null }],
          },
          include: [
            {
              model: db.USERS,
              as: "crtd_by",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "updtd_by",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "dealer",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "top_mgmt",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "risk_mgmt",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.m_cmdty,
              as: "cmdty",
            },
            {
              model: db.m_whs,
              as: "whs",
            },
            {
              model: db.mhOverLoc,
              as: "hOver_Loc",
            },
            {
              model: db.SUPPLIERS,
              as: "spplr",
            },
          ],
        },
      ],
      order: [["datetime", "DESC"]],
    });
    for (let key in transactions.rows) {
      if (transactions.rows[key].dataValues.offer == null) {
        continue;
      }
      supplierPerId.dataValues.recent_transactions.push(
        transactions.rows[key].dataValues
      );
      supplierPerId.dataValues.recent_transactions[
        key
      ].offer.dataValues.price_final =
        supplierPerId.dataValues.recent_transactions[
          key
        ].offer.dataValues.price_final.toFixed(2);
      supplierPerId.dataValues.recent_transactions[key].offer.dataValues.price =
        supplierPerId.dataValues.recent_transactions[
          key
        ].offer.dataValues.price.toFixed(2);
    }

    return successResponse(req, res, supplierInfoData);
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleHistoryAll = async (req, res) => {
  const { page_number, page_size } = req.query;
  const offset = (page_number - 1) * page_size;

  try {
    const userId = getUserID(req);
    if (!userId) {
      return errorResponse(req, res, "User not authorized");
    }
    const suppliersIds = await db.SUPPLIERS.findAndCountAll({
      attributes: ["id", "deleted_at"],
      offset: offset,
      limit: page_size,
      where: { deleted_at: null },
    });

    let supplierArray = [];

    for (let id in suppliersIds.rows) {
      let supplierPerId = await db.SUPPLIERS.findOne({
        attributes: [
          "id",
          "supplier_id",
          "name",
          "created_at",
          "updated_at",
          "updated_by_id",
        ],
        where: {
          id: suppliersIds.rows[id].dataValues.id,
        },
        include: [
          {
            model: db.USERS,
            as: "crtd_by",
            attributes: ["name", "created_at"],
          },
        ],

        order: [["id", "ASC"]],
      });
      const supplierHistory = await history(
        db,
        suppliersIds.rows[id].dataValues.id
      );
      const idSupplier = supplierPerId.dataValues.id;
      const transactions = await db.trns.findAndCountAll({
        include: [
          {
            model: db.OFFERS,
            as: "offer",
            where: {
              supplier_id: idSupplier,
              [Op.not]: [{ transaction_id: null }],
            },
            attributes: {
              include: [
                ["risk_mgmt_price_recommendation", "risk_mgmt_price_rec"],
              ],
              exclude: ["risk_mgmt_price_recommendation"],
            },
            include: [
              {
                model: db.USERS,
                as: "crtd_by",
                attributes: ["id", "name", "employee_id"],
              },
              {
                model: db.USERS,
                as: "updtd_by",
                attributes: ["id", "name", "employee_id"],
              },
              {
                model: db.USERS,
                as: "dealer",
                attributes: ["id", "name", "employee_id"],
              },
              {
                model: db.USERS,
                as: "top_mgmt",
                attributes: ["id", "name", "employee_id"],
              },
              {
                model: db.USERS,
                as: "risk_mgmt",
                attributes: ["id", "name", "employee_id"],
              },
              {
                model: db.m_cmdty,
                as: "cmdty",
              },
              {
                model: db.m_whs,
                as: "whs",
              },
              {
                model: db.mhOverLoc,
                as: "hOver_Loc",
              },
              {
                model: db.SUPPLIERS,
                as: "spplr",
              },
            ],
          },
        ],
        offset: (page_number - 1) * page_size,
        limit: page_size,
      });
      supplierPerId.dataValues.count_otif = 0;
      if (!supplierHistory) {
        supplierPerId.dataValues.price_avg = 0;
        supplierPerId.dataValues.total_trn = 0;
        supplierPerId.dataValues.count_otif = 0;
        supplierPerId.dataValues.count_not_otif = 0;
        supplierPerId.dataValues.otif_percentage = 0;
        supplierPerId.dataValues.recent_transactions = [];
        supplierArray.push(supplierPerId.dataValues);
      } else {
        supplierPerId.dataValues.price_avg = Number(
          supplierHistory[0].price_avg
        );

        for (let key in transactions.rows) {
          transactions.rows[key].is_otif
            ? supplierPerId.dataValues.count_otif++
            : supplierPerId.dataValues.count_otif;
        }

        //ini supplier data home
        supplierPerId.dataValues.total_trn = transactions.count;
        supplierPerId.dataValues.count_not_otif =
          supplierPerId.dataValues.total_trn -
          supplierPerId.dataValues.count_otif;
        supplierPerId.dataValues.otif_percentage = isNaN(
          (Number(supplierPerId.dataValues.count_otif) /
            Number(supplierPerId.dataValues.total_trn)) *
            100
        )
          ? 0
          : (
              (Number(supplierPerId.dataValues.count_otif) /
                Number(supplierPerId.dataValues.total_trn)) *
              100
            ).toFixed(2);
        supplierPerId.dataValues.recent_transactions = [];
        supplierArray.push(supplierPerId.dataValues);
      }

      for (let key in transactions.rows) {
        if (transactions.rows[key].dataValues.offer == null) {
          continue;
        }
        transactions.rows[key].dataValues.offer.dataValues.price_final =
          Number(
            transactions.rows[key].dataValues.offer.dataValues.price_final
          ).toFixed(2) ?? 0;
        transactions.rows[key].dataValues.offer.dataValues.price =
          Number(
            transactions.rows[key].dataValues.offer.dataValues.price
          ).toFixed(2) ?? 0;
        supplierPerId.dataValues.recent_transactions.push(
          transactions.rows[key].dataValues
        );
      }
    }

    return successResponse(req, res, {
      suppliers_history: supplierArray,
      total: suppliersIds.count,
    });
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

export const SupplierScheduleTransactions = async (req, res) => {
  const supplier_id = req.params.supplier_id;
  const { page_number, page_size } = req.query;
  try {
    const userId = getUserID(req);
    if (!userId) {
      return errorResponse(req, res, "User not authorized");
    }
    const dataSupplier = await db.SUPPLIERS.findOne({
      where: { supplier_id },
      include: [
        {
          model: db.USERS,
          as: "crtd_by",
          attributes: ["id", "name"],
        },
      ],
    });

    const idSupplier = dataSupplier.id;

    const transactions = await db.trns.findAndCountAll({
      include: [
        {
          model: db.OFFERS,
          as: "offer",
          attributes: {
            include: [
              ["risk_mgmt_price_recommendation", "risk_mgmt_price_rec"],
            ],
            exclude: ["risk_mgmt_price_recommendation"],
          },
          where: {
            supplier_id: idSupplier,
            [Op.not]: [{ transaction_id: null }],
          },
          include: [
            {
              model: db.USERS,
              as: "crtd_by",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "updtd_by",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "dealer",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "top_mgmt",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.USERS,
              as: "risk_mgmt",
              attributes: ["id", "name", "employee_id"],
            },
            {
              model: db.m_cmdty,
              as: "cmdty",
            },
            {
              model: db.m_whs,
              as: "whs",
            },
            {
              model: db.mhOverLoc,
              as: "hOver_Loc",
            },
            {
              model: db.SUPPLIERS,
              as: "spplr",
            },
          ],
        },
      ],
      order: [["datetime", "DESC"]],
      offset: (page_number - 1) * page_size,
      limit: page_size,
    });

    return successResponse(req, res, {
      supplier: dataSupplier,
      transactions: transactions.rows,
      total: transactions.count,
    });
  } catch (error) {
    return errorResponse(req, res, error.message);
  }
};

async function history(db, supplierId) {
  try {
    const supplierHistory = [];

    const sqlRows = await db.OFFERS.findAll({
      attributes: [
        "supplier_id",
        [
          Sequelize.literal(
            '(SUM("price_final" * "quantity") / SUM("quantity"))'
          ),
          "price_avg",
        ],
        [Sequelize.literal('(COUNT("transaction_id"))'), "total_trn"],
        [Sequelize.literal('(COUNT("id"))'), "count_otif"],
        "transaction_id",
      ],
      group: ["supplier_id", "transaction_id"],
      where: {
        supplier_id: supplierId,
        status: "approved",
        [Op.not]: [{ transaction_id: null }],
      },
    });

    if (sqlRows.length > 0) {
      for (const v of sqlRows) {
        let getTransactionIsOTIF = await db.trns.findOne({
          attributes: ["is_otif"],
          where: {
            id: v.dataValues.transaction_id,
          },
        });
        supplierHistory.push({
          price_avg:
            v?.dataValues.price_avg === null
              ? 0 + ""
              : v.dataValues.price_avg.toFixed(2) + "",
          total_trn: v.dataValues.total_trn,
          count_otif: getTransactionIsOTIF?.dataValues.is_otif ?? 0,
          count_not_otif:
            v.dataValues.total_trn - getTransactionIsOTIF?.dataValues.is_otif ??
            0,
          otif_percentage:
            (Number(getTransactionIsOTIF?.dataValues.is_otif ?? 0) /
              Number(v.dataValues.total_trn)) *
            100,
        });
      }

      return supplierHistory;
    } else {
      supplierHistory.push({
        price_avg: 0 + "",
        total_trn: 0,
        count_otif: "-",
        count_not_otif: "-",
        otif_percentage: "-",
      });

      return supplierHistory;
    }
  } catch (error) {
    throw error;
  }
}
