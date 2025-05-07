import React, { useState } from 'react';
import { List, Paper, ListItem, ListItemButton, IconButton, Collapse, Box } from '@mui/material';
import { Edit as EditIcon, ExpandMore, ChevronRight } from '@mui/icons-material';
import Tag from './Tag';

const TagItem = ({ tag, level = 0, onTagClick, onTagEdit }) => {
    const [hovered, setHovered] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const hasChildren = tag.children && tag.children.length > 0;

    return (
        <>
            <ListItem
                disablePadding
                sx={{
                    pl: level * 2,
                    '&:hover': {
                        backgroundColor: 'action.hover'
                    },
                    minWidth: 'max-content'
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {hasChildren && (
                    <IconButton
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                        sx={{ flexShrink: 0 }}
                    >
                        {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </IconButton>
                )}
                {!hasChildren && <Box sx={{ width: 32, flexShrink: 0 }} />}

                <ListItemButton
                    onClick={() => onTagClick({ ...tag, children: undefined })}
                    sx={{
                        px: 1,
                        flexGrow: 0,
                        borderRadius: '5px',
                        minWidth: 'max-content'
                    }}
                >
                    <Tag
                        text={tag.name}
                        color={tag.color}
                        title={tag.path}
                        styles={{ my: '-5px' }}
                    />
                </ListItemButton>
                {
                    onTagEdit && <IconButton
                        size="small"
                        onClick={() => onTagEdit({ ...tag, children: undefined })}
                        sx={{
                            ml: 'auto',
                            opacity: hovered ? 0.6 : 0,
                            '&:hover': { opacity: 1 },
                            transition: 'opacity 0.2s',
                            flexShrink: 0
                        }}
                    >
                        <EditIcon fontSize="small" />
                    </IconButton>
                }
            </ListItem>

            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ minWidth: 'max-content' }}>
                        {tag.children.map(child => (
                            <TagItem
                                key={child.id}
                                tag={child}
                                level={level + 1}
                                onTagClick={onTagClick}
                                onTagEdit={onTagEdit}
                            />
                        ))}
                    </List>
                </Collapse>
            )}
        </>
    );
};

const buildTree = (tags, parentId = null) => {
    return tags
        .filter(tag => tag.parentId === parentId)
        .map(tag => ({
            ...tag,
            children: buildTree(tags, tag.id)
        }));
};

const TagTree = ({ tags = [], onTagClick, onTagEdit, maxHeight, flex, createBtn = <></> }) => {
    const tagTree = buildTree(tags);

    return <Paper
        elevation={3}
        sx={{
            bgcolor: 'background.paper',
            p: 1,
            m: 1,
            marginBottom: 2,
            marginRight: 0,
            overflowY: 'auto',
            overflowX: 'auto',
            maxHeight: maxHeight,
            flex: flex,
            minWidth: 0,
            '& > .MuiList-root': {
                minWidth: 'max-content'
            }
        }}
    >
        <List sx={{ minWidth: 'max-content' }}>
            {[createBtn, ...tagTree.map(tag => (
                <TagItem
                    key={tag.id}
                    tag={tag}
                    onTagClick={onTagClick}
                    onTagEdit={onTagEdit}
                />
            ))]}
        </List>
    </Paper>;
};

export default TagTree;