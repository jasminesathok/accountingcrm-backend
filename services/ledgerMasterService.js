const Ledger = require('../models/ledgerModel');
const Account = require('../models/accountModel');
const BankAccount = require('../models/bankAccountModel');
const Client = require('../models/clientModel');
const Vendor = require('../models/vendorModel');
const { Op } = require('sequelize');

const INCLUDES = [
  { model: Account, attributes: ['name', 'code', 'type'] },
  { model: BankAccount, attributes: ['account_name', 'bank_name'] },
  { model: Client, attributes: ['first_name', 'last_name', 'company_name'] },
  { model: Vendor, attributes: ['name', 'company_name'] },
  { model: Ledger, as: 'ParentLedger', attributes: ['ledger_name', 'ledger_code'] }
];

const flatten = (r) => {
  const j = r.toJSON();
  return {
    ...j,
    account_name: j.Account?.name,
    bank_account_name: j.BankAccount?.account_name,
    client_name: j.Client ? (j.Client.company_name || `${j.Client.first_name || ''} ${j.Client.last_name || ''}`.trim()) : undefined,
    vendor_name: j.Vendor ? (j.Vendor.company_name || j.Vendor.name) : undefined,
    parent_ledger_name: j.ParentLedger?.ledger_name
  };
};

// Fills Account Category/Code from the linked Chart of Account and the
// Party Name/Contact snapshot from the linked Client or Vendor, whenever
// the caller didn't supply them explicitly - mirrors the Transaction
// module's applyDerivedFields helper.
async function applyDerivedFields(data) {
  if (data.account_id && (!data.account_category || !data.account_code)) {
    const acc = await Account.findByPk(data.account_id);
    if (acc) {
      if (!data.account_category) data.account_category = acc.type;
      if (!data.account_code) data.account_code = acc.code;
    }
  }
  if (data.current_balance === undefined || data.current_balance === '' || data.current_balance === null) {
    data.current_balance = data.opening_balance || 0;
  }
  if (data.party_type === 'client' && data.client_id && !data.party_name) {
    const c = await Client.findByPk(data.client_id);
    if (c) {
      data.party_name = c.company_name || `${c.first_name || ''} ${c.last_name || ''}`.trim();
      if (!data.contact_person) data.contact_person = c.contact_person;
      if (!data.mobile_number) data.mobile_number = c.phone;
      if (!data.email_address) data.email_address = c.email;
    }
  }
  if (data.party_type === 'vendor' && data.vendor_id && !data.party_name) {
    const v = await Vendor.findByPk(data.vendor_id);
    if (v) {
      data.party_name = v.company_name || v.name;
      if (!data.contact_person) data.contact_person = v.contact_person;
      if (!data.mobile_number) data.mobile_number = v.phone;
      if (!data.email_address) data.email_address = v.email;
    }
  }
  if (data.bank_account_id && (!data.bank_name || !data.bank_account_number)) {
    const b = await BankAccount.findByPk(data.bank_account_id);
    if (b) {
      if (!data.bank_name) data.bank_name = b.bank_name;
      if (!data.bank_account_number) data.bank_account_number = b.account_number;
      if (!data.ifsc_code) data.ifsc_code = b.ifsc_code;
      if (!data.branch_name) data.branch_name = b.branch_name;
    }
  }
  return data;
}

const LedgerMasterService = {
  async getAll({ search = '', page = 1, limit = 10, ledger_type, ledger_group, status }) {
    const offset = (page - 1) * limit;
    const where = {
      [Op.and]: [
        {
          [Op.or]: [
            { ledger_code: { [Op.like]: `%${search}%` } },
            { ledger_name: { [Op.like]: `%${search}%` } },
            { party_name: { [Op.like]: `%${search}%` } }
          ]
        }
      ]
    };
    if (ledger_type) where[Op.and].push({ ledger_type });
    if (ledger_group) where[Op.and].push({ ledger_group });
    if (status) where[Op.and].push({ status });

    const { rows, count } = await Ledger.findAndCountAll({
      where,
      include: INCLUDES,
      order: [['ledger_name', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return { rows: rows.map(flatten), total: count };
  },

  async getOne(id) {
    const record = await Ledger.findByPk(id, { include: INCLUDES });
    if (!record) throw { status: 404, message: 'Ledger not found' };
    return flatten(record);
  },

  async create(data, userId) {
    if (!data.ledger_code) {
      const count = await Ledger.count();
      data.ledger_code = `LED-${String(count + 1).padStart(5, '0')}`;
    }
    await applyDerivedFields(data);
    data.created_by = data.created_by || (userId ? String(userId) : undefined);

    const record = await Ledger.create(data);
    return await LedgerMasterService.getOne(record.id);
  },

  async update(id, data, userId) {
    const record = await Ledger.findByPk(id);
    if (!record) throw { status: 404, message: 'Ledger not found' };
    await applyDerivedFields(data);
    data.updated_by = data.updated_by || (userId ? String(userId) : undefined);
    await record.update(data);
    return await LedgerMasterService.getOne(id);
  },

  async delete(id) {
    const record = await Ledger.findByPk(id);
    if (!record) throw { status: 404, message: 'Ledger not found' };
    const childCount = await Ledger.count({ where: { parent_ledger_id: id } });
    if (childCount > 0) {
      throw { status: 409, message: 'Cannot delete this ledger because other ledgers are linked to it as their Parent Ledger. Reassign or delete those first.' };
    }
    await record.destroy();
  }
};

module.exports = LedgerMasterService;
