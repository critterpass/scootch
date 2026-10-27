/* global http, output, POSE, KEYFRAMES, DUO_FOLD_URL */
// Folds iPhone Duo from inside a flow, through tools/scripts/duo-fold-server.py, which the run
// starts on a device with two displays (it sets DUO_FOLD_URL). Use it as
//   - runScript:
//       file: ../common/fold.js
//       env:
//         POSE: book            # closed, book, stand or open
// or with KEYFRAMES set to a JSON list of {atMs, angle} to move the hinge over time. Guard the step
// with `when: true: ${typeof DUO_FOLD_URL !== 'undefined'}` so other devices skip it.
const target =
  typeof KEYFRAMES !== 'undefined' && KEYFRAMES !== ''
    ? 'keyframes=' + encodeURIComponent(KEYFRAMES)
    : 'pose=' + encodeURIComponent(POSE);
const response = http.post(DUO_FOLD_URL + '/fold?' + target, { body: '' });
if (!response.ok) {
  throw new Error('The fold did not happen: ' + response.body);
}
output.fold = response.body;
