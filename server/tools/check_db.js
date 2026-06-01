(require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }));
const { query } = require('../db/database');
(async () => {
  try {
    let r = await query("SELECT column_name FROM information_schema.columns WHERE table_name='attendance_sessions' ORDER BY ordinal_position");
    console.log('attendance_sessions:', r.rows.map(rr => rr.column_name).join(', '));
    r = await query("SELECT column_name FROM information_schema.columns WHERE table_name='attendance_attempts' ORDER BY ordinal_position");
    console.log('attendance_attempts:', r.rows.map(rr => rr.column_name).join(', '));
  } catch (e) {
    console.error('ERR', e.message || e);
  } finally {
    process.exit();
  }
})();
