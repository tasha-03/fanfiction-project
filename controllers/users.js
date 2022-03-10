const ControllerException = require("../utils/ControllerException");
const knex = require("../utils/db");

// register (any)
exports.register = async ({ login, email, password }) => {
  const [recordWithLogin] = await knex("users")
    .select("id")
    .where({ login: login });
  if (recordWithLogin) {
    throw new ControllerException("LOGIN_IN_USE", "Login is already in use");
  }
  const [recordWithEmail] = await knex("users")
    .select("id")
    .where({ email: email });
  if (recordWithEmail) {
    throw new ControllerException("EMAIL_IN_USE", "Email in use");
  }
  const [{ id: userId }] = await knex("users")
    .insert([{ login, email, password }]) // password hashing
    .returning("id");
  return { userId };
};

// request email confirmation (user)
exports.requestEmailConfirmation = async ({ userId }) => {
  //generate somehow (uuid?)
  const confirmationCode = "000000";
  const [record] = await knex("users")
    .select("email_is_confirmed as emailIsConfirmed")
    .where({ id: userId });
  if (!record) {
    throw new ControllerException(
      "INTERNAL_SERVER_ERROR",
      "Internal server error"
    );
  }
  if (record.emailIsConfirmed) {
    throw new ControllerException(
      "ALREADY_CONFIRMED",
      "Email has been already confirmed"
    );
  }
  const [{ email: email }] = await knex("users")
    .where({ id: userId })
    .update({
      email_confirmation_code: confirmationCode,
      updated_at: knex.fn.now(),
    })
    .returning("email");
  // send email (nodemailer)
  return {};
};

// confirm email (user)
exports.confirmEmail = async ({ userId, confirmationCode }) => {
  try {
    const [{ email_confirmation_code: emailConfirmationCode }] = await knex(
      "users"
    )
      .where({ id: userId })
      .returning("email_confirmation_code");

    //compare confirmation codes
    if (emailConfirmationCode === confirmationCode) {
      await knex("users").where({ id: userId }).update({
        email_is_confirmed: true,
        updated_at: knex.fn.now(),
      });
    } else {
      throw new ControllerException(
        "CONFIRMATION_CODE_IS_INVALID",
        "Confirmation code is invalid"
      );
    }

    return {};
  } catch (error) {
    throw new ControllerException("", "");
  }
};

// login (any)
exports.login = async ({ login, password }) => {
  const [record] = await knex("users").select("id").where({ login, password });
  if (!record) {
    throw new ControllerException("WRONG_CREDENTIALS", "Wrong credentials");
  } else {
    return { userId: record.id };
  }
};

// edit profile (user)
exports.editProfile = async ({ userId, login, email, password }) => {
  try {
    await knex("users").where({ id: userId }).update({
      login: login,
      email: email,
      password: password,
      updated_at: knex.fn.now(),
    });
    return {};
  } catch (error) {
    throw new ControllerException("LOGIN_IN_USE", "Email is in use");
  }
};

// change role (admin)
exports.changeRole = async ({ userId, role }) => {
  try {
    await knex("users").where({ id: userId }).update({
      role: role,
      updated_at: knex.fn.now(),
    });
    return {};
  } catch (error) {
    throw new ControllerException("", "");
  }
};

// deactivate profile (user)
exports.deactivateProfile = async ({ userId }) => {
  try {
    await knex("users").where({ id: userId }).update({
      active: false,
      updated_at: knex.fn.now(),
    });
    return {};
  } catch (error) {
    throw new ControllerException("", "");
  }
};

// activate profile (user)
exports.activateProfile = async ({ userId }) => {
  try {
    await knex("users").where({ id: userId }).update({
      active: true,
      updated_at: knex.fn.now(),
    });
    return {};
  } catch (error) {
    throw new ControllerException("", "");
  }
};

// change preferences (user)
exports.changePreferences = async ({
  userId,
  dark_theme,
  email_notitfications_on,
}) => {
  try {
    await knex("users").where({ id: userId }).update({
      dark_theme: dark_theme,
      email_notitfications_on: email_notitfications_on,
      updated_at: knex.fn.now(),
    });
    return {};
  } catch (error) {
    throw new ControllerException("", "");
  }
};

// restore password
exports.restorePassword = async ({ login }) => { // добавить restorePasswordCode + время на подтверждение, как с подтверждением почты
  try {
    const confirmationCode = "000000"; //generate somehow (uuid?)
    const [{ email: email }] = await knex("users")
      .where({ login: login })
      .update({
        email_confirmation_code: confirmationCode,
        updated_at: knex.fn.now(),
      })
      .returning("email");
    //send email
    if (emailConfirmationCode === confirmationCode) {
      return {};
    } else {
      throw new ControllerException(
        "CONFIRMATION_CODE_IS_INVALID",
        "Confirmation code is invalid"
      );
    }
  } catch (error) {
    throw new ControllerException("", "");
  }
};

exports.getAllUsers = async ({ limit = 20, page = 1 }) => {
  const records = await knex("users")
    .select("id", "login")
    .limit(limit)
    .offset(limit * (page - 1));
  return records;
};

exports.getUserById = async ({ userId }) => {
  const [record] = await knex("users")
    .select("id", "login", "role")
    .where({ id: userId });
  if (!record) {
    throw new ControllerException(
      "INTERNAL_SERVER_ERROR",
      "Internal server error"
    );
  }
  return record;
};
