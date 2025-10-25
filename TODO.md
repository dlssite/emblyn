# TODO: Fix Reaction Roles Dashboard Edit/Delete to Use Dropdown Selection

## Overview
The current reaction roles dashboard uses buttons for editing and deleting, limited to 5 per row. We need to change "Edit Existing" and "Delete" buttons to show dropdown menus listing all available reaction role posts for selection.

## Steps
1. **Update events/reactionRolesDashboard.js**
   - Add handler for 'reaction_role_list' button: Fetch all setups, create StringSelectMenuBuilder with "Edit: [title]" options (value: "edit_[messageId]").
   - Add handler for 'reaction_role_delete_list' button: Fetch all setups, create StringSelectMenuBuilder with "Delete: [title]" options (value: "delete_[messageId]").
   - Add handler for 'reaction_role_manage_select' StringSelectMenu:
     - If value starts with "edit_", show edit options for the messageId (reuse existing rr_edit_msg_ logic).
     - If value starts with "delete_", show confirmation buttons for deletion.
   - Add handler for 'confirm_delete_[messageId]' button: Confirm and perform deletion (delete message and DB entry).
   - Add handler for 'cancel_delete' button: Cancel deletion.

2. **Test the Implementation**
   - Run the bot and test the dashboard.
   - Click "Edit Existing" -> Verify dropdown appears with all setups.
   - Select an edit option -> Verify edit menu appears.
   - Click "Delete" -> Verify dropdown appears.
   - Select delete option -> Verify confirmation prompt.
   - Confirm delete -> Verify setup is deleted.
   - Test edge cases: No setups, invalid selections.

## Status
- [x] Step 1: Update events/reactionRolesDashboard.js
- [x] Step 2: Test the implementation
