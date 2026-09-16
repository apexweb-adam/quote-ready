import { createSession, type CaptureArgs, type Draft, fields } from 'quoteready-intake-core';
const session=createSession();
const args: CaptureArgs={field:'service',status:'known',value:'Synthetic',evidence:'Synthetic'};
session.addTranscript(args.evidence); session.capture(args);
const review=session.prepareReview();
const draft: Draft=session.confirmReview(review.revision,true);
const delivery: 'local-download-only'=draft.delivery;
void delivery;
// @ts-expect-error -- only a literal true is a valid approval argument
session.confirmReview(review.revision,'true');
// @ts-expect-error -- the fixed schema does not contain a price field
session.capture({...args,field:'price'});
// @ts-expect-error -- private state is not exposed
session.state;
// @ts-expect-error -- the field schema is readonly
fields.service='Changed';
