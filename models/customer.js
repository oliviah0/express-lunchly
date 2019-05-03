/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  static async bestCustomers() {
    const results = await db.query(
      `SELECT cust.id AS "id", 
          cust.first_name AS "firstName", 
          cust.last_name AS "lastName",
          cust.phone AS "phone",
          cust.notes AS "notes"
        FROM reservations AS res
        JOIN customers AS cust ON res.customer_id = cust.id
        GROUP BY customer_id, cust.id, cust.first_name, cust.last_name, cust.phone, cust.notes
        ORDER BY count(*) DESC
        LIMIT 10`
    )
    console.log(results)
    return results.rows.map(c => new Customer(c));

  }

  /** find all customers with specific name. */

  static async searchByName(searchName) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       WHERE customer_tokens @@ to_tsquery($1)
       ORDER BY last_name, first_name`,
       [searchName]
    );

    return results.rows.map(c => new Customer(c));
  }


  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    
    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }
    let newCustomer = new Customer(customer);
    return newCustomer;
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    const fullName = this.firstName + ' ' + this.lastName
    
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes, customer_tokens)
             VALUES ($1, $2, $3, $4, to_tsvector($5))
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes, fullName]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4, customer_tokens=to_tsvector($5)
             WHERE id=$6`,
        [this.firstName, this.lastName, this.phone, this.notes, fullName, this.id]
      );
    }
  }
}

module.exports = Customer;
