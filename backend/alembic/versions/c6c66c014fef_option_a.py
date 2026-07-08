"""option_a

Revision ID: c6c66c014fef
Revises: 
Create Date: 2026-07-06 18:47:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c6c66c014fef'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add current_count with default 0
    op.add_column('communities', sa.Column('current_count', sa.Integer(), server_default='0', nullable=False))
    
    # Add group_number
    op.add_column('communities', sa.Column('group_number', sa.Integer(), nullable=True))
    
    # We populate group_number sequentially
    op.execute("UPDATE communities SET group_number = sub.rn FROM (SELECT id, row_number() over () as rn FROM communities) as sub WHERE communities.id = sub.id")
    
    # Set group_number to NOT NULL and add unique constraint
    op.alter_column('communities', 'group_number', nullable=False)
    op.create_unique_constraint('uq_communities_group_number', 'communities', ['group_number'])
    
    # Drop groups table
    op.drop_index('ix_groups_id', table_name='groups', if_exists=True)
    op.drop_table('groups')


def downgrade() -> None:
    # Re-create groups table
    op.create_table('groups',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('group_number', sa.Integer(), autoincrement=False, nullable=False),
    sa.Column('community_id', sa.String(length=36), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['community_id'], ['communities.id'], name='groups_community_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='groups_pkey'),
    sa.UniqueConstraint('community_id', name='groups_community_id_key'),
    sa.UniqueConstraint('group_number', name='groups_group_number_key')
    )
    
    # Drop columns from communities
    op.drop_constraint('uq_communities_group_number', 'communities', type_='unique')
    op.drop_column('communities', 'group_number')
    op.drop_column('communities', 'current_count')
