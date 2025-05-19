import bcrypt from 'bcrypt';

const plainTextPassword = 'adminTest123';
const saltRounds = 10;

bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  console.log('Hashed password:', hash);
});
