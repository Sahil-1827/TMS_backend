const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const templatePath = path.join(
    __dirname,
    "../views/emails",
    options.template,
  );

  const html = await ejs.renderFile(templatePath, options.data);

  const mailOptions = {
    from: `"TMS Portal" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    html: html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
