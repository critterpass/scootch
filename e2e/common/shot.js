/* global http, output, NAME, DUO_FOLD_URL */
// Captures the panel of iPhone Duo that is lit, as NAME (a capture name, `<state>--<variant>`),
// through tools/scripts/duo-fold-server.py, and waits for it: the next step cannot change the
// screen first. Use it in place of `takeScreenshot` in a Duo flow whose next step moves on at once.
//   - runScript:
//       file: ../common/shot.js
//       env:
//         NAME: duo-closed-desk-waiting--en-light-default
const response = http.post(DUO_FOLD_URL + '/shot?name=' + encodeURIComponent(NAME), { body: '' });
if (!response.ok) {
  throw new Error('The capture was not taken: ' + response.body);
}
output.shot = response.body;
