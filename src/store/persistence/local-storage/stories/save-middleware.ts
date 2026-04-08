import {
	passageWithId,
	passageWithName,
	StoriesAction,
	StoriesState,
	storyWithId,
	storyWithName
} from '../../../stories';
import {isPersistablePassageChange} from '../../persistable-changes';
import {
	deletePassageById,
	deleteStory,
	doUpdateTransaction,
	savePassage,
	saveStory
} from './save';


// VIBEstory: save to filesystem via dev server API
function vibeSync(state: StoriesState, storyId: string) {
	const story = storyWithId(state, storyId);
	if (!story._vibeProject) return false;
	fetch('/__vibe/save', {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify(story)
	}).catch(e => console.warn('VIBEstory save failed:', e));
	return true;
}

let lastState: StoriesState;

/**
 * A middleware function to save changes to local storage. This should be called
 * *after* the main reducer runs.
 */
export function saveMiddleware(state: StoriesState, action: StoriesAction) {
	switch (action.type) {
		case 'init':
		case 'repair':
			// We take no action here on a repair action. This is to prevent messing up a
			// story's last modified date. If the user then edits the story, we'll save
			// their change and the repair then.
			break;

		case 'createPassage': {
			if (vibeSync(state, action.storyId)) break;
			if (!action.props.name) {
				throw new Error('Passage was created but with no name specified');
			}

			const story = storyWithId(state, action.storyId);
			const passage = passageWithName(state, story.id, action.props.name);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				savePassage(transaction, passage);
			});
			break;
		}

		case 'createPassages': {
			if (vibeSync(state, action.storyId)) break;
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				for (const props of action.props) {
					if (!props.name) {
						throw new Error('Passage was created but with no name specified');
					}

					savePassage(
						transaction,
						passageWithName(state, story.id, props.name)
					);
				}
			});
			break;
		}

		case 'createStory': {
			if (action.props._vibeProject) break; // VIBEstory: skip localStorage for vibe stories
			if (!action.props.name) {
				throw new Error('Story was created but with no name specified');
			}

			const story = storyWithName(state, action.props.name);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				for (const passage of story.passages) {
					savePassage(transaction, passage);
				}
			});
			break;
		}

		case 'deletePassage': {
			if (vibeSync(state, action.storyId)) break;
			const story = storyWithId(state, action.storyId);

			// We can't dig up the passage in question right now, because
			// previousStories is only a shallow copy, and it's gone there at
			// this point in time.

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);
				deletePassageById(transaction, action.passageId);
			});
			break;
		}

		case 'deletePassages': {
			if (vibeSync(state, action.storyId)) break;
			const story = storyWithId(state, action.storyId);

			// See above comment about passages.

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				for (const passageId of action.passageIds) {
					deletePassageById(transaction, passageId);
				}
			});
			break;
		}

		case 'deleteStory': {
			const delStory = storyWithId(lastState, action.storyId);
			if (delStory._vibeProject) break; // VIBEstory: don't delete from localStorage
			// The story will be gone from state by the time we're called, so we
			// need a cached copy.

			const story = storyWithId(lastState, action.storyId);

			doUpdateTransaction(transaction => {
				// We have to delete all passages, then the story itself.

				for (const passage of story.passages) {
					deletePassageById(transaction, passage.id);
				}

				deleteStory(transaction, story);
			});
			break;
		}

		case 'updatePassage':
			if (isPersistablePassageChange(action.props)) {
				const story = storyWithId(state, action.storyId);
				const passage = passageWithId(state, action.storyId, action.passageId);

				doUpdateTransaction(transaction => {
					saveStory(transaction, story);
					savePassage(transaction, passage);
				});
				break;
			}
			break;

		case 'updatePassages': {
			if (vibeSync(state, action.storyId)) break;
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				const passageIds = Object.keys(action.passageUpdates).filter(
					passageId =>
						isPersistablePassageChange(action.passageUpdates[passageId])
				);

				for (const passageId of passageIds) {
					savePassage(
						transaction,
						passageWithId(state, action.storyId, passageId)
					);
				}
			});
			break;
		}

		case 'updateStory': {
			if (vibeSync(state, action.storyId)) break;
			const story = storyWithId(state, action.storyId);

			doUpdateTransaction(transaction => {
				saveStory(transaction, story);

				// Special case: if the passages property is being set, we need to
				// delete any passages there were in the story, but aren't anymore.

				if (action.props.passages) {
					const lastStory = storyWithId(lastState, action.storyId);

					for (const passage of lastStory.passages) {
						if (!action.props.passages.some(({id}) => id === passage.id)) {
							deletePassageById(transaction, passage.id);
						}
					}
				}

				story.passages.forEach(passage => savePassage(transaction, passage));
			});
			break;
		}

		default:
			console.warn(
				`Story action ${
					(action as any).type
				} has no local storage persistence handler`
			);
	}

	lastState = state;
}
