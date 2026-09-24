"""add spatial data foundation

Revision ID: 89f65e8d94f2
Revises: 7e7e860c37fa
Create Date: 2026-09-24 12:55:14.809373

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '89f65e8d94f2'
down_revision: Union[str, Sequence[str], None] = '7e7e860c37fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Add spatial fields to communities
    op.add_column('communities', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('communities', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('communities', sa.Column('spatial_metadata', sa.dialects.postgresql.JSONB(), nullable=True))

    # Create field_features table
    op.create_table(
        'field_features',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('feature_type', sa.String(), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('accuracy_meters', sa.Float(), nullable=True),
        sa.Column('captured_by_id', sa.Integer(), nullable=False),
        sa.Column('metadata_json', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('captured_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['captured_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_field_features_id'), 'field_features', ['id'], unique=False)
    op.create_index(op.f('ix_field_features_community_id'), 'field_features', ['community_id'], unique=False)
    op.create_index(op.f('ix_field_features_feature_type'), 'field_features', ['feature_type'], unique=False)
    op.create_index(op.f('ix_field_features_captured_by_id'), 'field_features', ['captured_by_id'], unique=False)

    # Add field_feature_id to survey_records
    op.add_column('survey_records', sa.Column('field_feature_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_survey_records_field_feature_id'), 'survey_records', ['field_feature_id'], unique=False)
    op.create_foreign_key('fk_survey_records_field_feature', 'survey_records', 'field_features', ['field_feature_id'], ['id'], ondelete='SET NULL')



def downgrade() -> None:
    """Downgrade schema."""

    # Remove from survey_records
    op.drop_constraint('fk_survey_records_field_feature', 'survey_records', type_='foreignkey')
    op.drop_index(op.f('ix_survey_records_field_feature_id'), table_name='survey_records')
    op.drop_column('survey_records', 'field_feature_id')

    # Drop field_features
    op.drop_index(op.f('ix_field_features_captured_by_id'), table_name='field_features')
    op.drop_index(op.f('ix_field_features_feature_type'), table_name='field_features')
    op.drop_index(op.f('ix_field_features_community_id'), table_name='field_features')
    op.drop_index(op.f('ix_field_features_id'), table_name='field_features')
    op.drop_table('field_features')

    # Remove spatial fields from communities
    op.drop_column('communities', 'spatial_metadata')
    op.drop_column('communities', 'longitude')
    op.drop_column('communities', 'latitude')

