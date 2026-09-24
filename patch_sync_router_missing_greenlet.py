import re

with open('backend/app/routers/sync_router.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add curr_user_name
content = content.replace(
    "curr_user_id = current_user.id\n    comm_id = community.id\n    comm_name = community.name",
    "curr_user_id = current_user.id\n    curr_user_name = current_user.name\n    comm_id = community.id\n    comm_name = community.name"
)

# Replace current_user.name with curr_user_name
content = content.replace(
    "message=f\"{current_user.name} submitted {record.survey_type.capitalize()} Survey\\nCommunity: {comm_name}\\nEntity ID: {rec_entity_id}\"",
    "message=f\"{curr_user_name} submitted {record.survey_type.capitalize()} Survey\\nCommunity: {comm_name}\\nEntity ID: {rec_entity_id}\""
)

with open('backend/app/routers/sync_router.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed MissingGreenlet by avoiding expired attribute access")
