import React, { useState } from 'react';
import {
    List,
    ListItem,
    ListItemButton,
    Chip,
    IconButton,
    Collapse,
    Box
} from '@mui/material';
import { Edit as EditIcon, ExpandMore, ChevronRight } from '@mui/icons-material';

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
                    }
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {hasChildren && (
                    <IconButton
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? <ExpandMore fontSize="small" /> : <ChevronRight fontSize="small" />}
                    </IconButton>
                )}
                {!hasChildren && <Box sx={{ width: 32 }} />}

                <ListItemButton
                    onClick={() => onTagClick({ ...tag, children: undefined })}
                    sx={{ px: 1, flexGrow: 0, borderRadius: '5px' }}
                >
                    <Chip
                        label={tag.name}
                        size="small"
                        sx={{
                            backgroundColor: tag.color,
                            color: 'white',
                            marginBottom: '-5px',
                            marginTop: '-5px',
                            '& .MuiChip-label': {
                                px: 1
                            }
                        }}
                    />
                </ListItemButton>

                <IconButton
                    size="small"
                    onClick={() => onTagEdit({ ...tag, children: undefined })}
                    sx={{
                        ml: 'auto',
                        opacity: hovered ? 0.6 : 0,
                        '&:hover': { opacity: 1 },
                        transition: 'opacity 0.2s'
                    }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </ListItem>

            {hasChildren && (
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
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

const TagTree = ({ tags = [], onTagClick, onTagEdit }) => {
    const tagTree = buildTree(tags);

    return <List
        sx={{
            width: '100%',
            bgcolor: 'background.paper',
            p: 1
        }}
    >
        {tagTree.map(tag => (
            <TagItem
                key={tag.id}
                tag={tag}
                onTagClick={onTagClick}
                onTagEdit={onTagEdit}
            />
        ))}
    </List>;
};

export default TagTree;