import {
    Dialog, DialogActions, DialogContent, DialogTitle,
    Button, TextField, Stack, Typography, List, Paper,
    ListItem, IconButton, Divider
} from "@mui/material";
import { AddCircle, Clear } from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useState } from 'react';
import uuid from 'react-uuid';
import ColorPicker from "./ColorPicker";
import Tag from "./Tag";

const EditTag = ({ tagTree, tagList, tag, setTag, onTagEdit, onTagsDelete }) => {

    const [color, setColor] = useState('#1565C0');
    const [children, setChildren] = useState([]);

    const [newTagName, setNewTagName] = useState('');
    const [newTagcolor, setNewTagColor] = useState('#1565C0');

    // todo: change parent tag
    // const [parentTag, setParentTag] = useState(null);
    // const [chooseParentOpen, setChooseParentOpen] = useState(false);

    const tagId = useMemo(() => {
        return tag?.id ?? null;
    }, [tag]);

    useEffect(() => {
        if (!(tag && tagList)) return;
        if (tag.color) setColor(tag.color);

        // todo: change parent tag
        // if (tag.parentId) setParentTag(tagList.find(t => t.id === tag.parentId) ?? null);
    }, [tag, tagList]);

    useEffect(() => {
        if (!(tagId && tagList)) return;
        setChildren(tagList
            .filter(t => t.parentId === tagId)
            .map(t => ({ ...t, deleted: false }))
        );
    }, [tagId, tagList]);

    const toggleChildDelete = useCallback((id, isDeleted) => {
        if (typeof isDeleted !== 'boolean') return;
        setChildren(prev => {
            const updated = prev.find(tag => tag.id === id);
            if (updated) updated.deleted = isDeleted;
            return [...prev];
        });
    }, []);

    const addChild = useCallback(() => {
        setChildren(prev => [
            ...prev,
            {
                id: uuid(),
                name: newTagName.trim(),
                color: newTagcolor,
                parentId: tag.id,
                deleted: false
            }
        ]);
        setNewTagName('');
    }, [tag, newTagName, newTagcolor]);

    const close = useCallback(() => {
        setTag(prev => ({ ...prev, mode: null }));
    }, [setTag]);

    if (!tag) return <></>;
    return <>
        <Dialog
            open={tag.mode === 'edit'}
            onClose={close}
        >
            <DialogTitle align="center">Редактирование тега</DialogTitle>
            <DialogContent sx={{ mb: 1 }}>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Название тега"
                    fullWidth
                    variant="outlined"
                    value={tag.name}
                    inputProps={{ maxLength: 30 }}
                    onChange={e => setTag(prev => ({ ...prev, name: e.target.value }))}
                    sx={{ marginBottom: '16px' }}
                />
                <Stack
                    direction="row"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mx: '8px'
                    }}
                >
                    <Typography variant="h6">Цвет тега:</Typography>
                    <ColorPicker
                        initialColor={color}
                        onChange={setColor}
                    />
                </Stack>
                <Typography variant="h6" align="center" sx={{ my: 0.75 }}>Вложенные теги</Typography>
                <Paper elevation={1} sx={{ mx: 'auto', mb: 1.75 }}>
                    <List sx={{
                        py: 0.75, px: 0.5,
                        maxHeight: '40vh',
                        overflowY: 'auto',
                        overflowX: 'hidden'
                    }}>
                        {children.length ? null : <Tag
                            text="Вложенные теги отсутствуют" color="#888888"
                            styles={{
                                px: 1, py: 2, m: 0.5,
                                color: 'white',
                                fontSize: '16px'
                            }}
                        />}
                        {children.map(t =>
                            <ListItem
                                key={t.id ?? Math.random()}
                                disablePadding
                                className={`tag-edit-nested-tag ${t.deleted ? 'tag-edit-cancel-delete' : ''}`}
                                onClick={() => {
                                    if (!t.deleted) return;
                                    toggleChildDelete(t.id, false);
                                }}
                                title={t.deleted
                                    ? 'Данный тег будет удалён вместе со всеми вложенными\nНажмите, чтобы отменить удаление'
                                    : undefined
                                }
                            >
                                <Tag
                                    text={t.name} color={t.deleted ? '#AAAAAA' : t.color}
                                    styles={{
                                        px: 1, py: 2, m: 0,
                                        fontSize: '14px',
                                        maxWidth: '300px',
                                        textDecoration: t.deleted ? 'line-through' : 'none'
                                    }}
                                />
                                <IconButton
                                    title="Удалить данный тег и все вложенные"
                                    sx={{ color: '#dd0000', m: 0 }}
                                    disabled={t.deleted}
                                    onClick={e => {
                                        e.stopPropagation();
                                        toggleChildDelete(t.id, true);
                                    }}
                                >
                                    <Clear />
                                </IconButton>
                            </ListItem>
                        )}
                    </List>
                </Paper>
                <Divider />
                <Typography variant="h6" align="center" sx={{ mt: 0.75, mb: 1 }}>Добавление вложенного тега</Typography>
                <Stack direction="row" sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                        margin="dense"
                        label="Название нового тега"
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={newTagName}
                        inputProps={{ maxLength: 30 }}
                        onChange={e => setNewTagName(e.target.value)}
                        sx={{ m: 0, mr: 1.25 }}
                    />
                    <ColorPicker
                        initialColor={newTagcolor}
                        onChange={setNewTagColor}
                    />
                    <IconButton
                        title="Создать тег"
                        disabled={!newTagName.trim()}
                        onClick={addChild}
                        sx={{
                            ml: 0.75,
                            color: "#00aa00",
                            '&:hover': { color: "#00cc00" },
                            transition: '0.5s',
                        }}
                    ><AddCircle fontSize="large" sx={{ m: -0.5 }} /></IconButton>
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    mt: '-8px', mb: '8px'
                }}
            >
                <Button
                    color="error"
                    variant="contained"
                    onClick={() => onTagsDelete([tag.id])}
                >
                    Удалить тег
                </Button>
                <Button
                    color="error"
                    variant="outlined"
                    onClick={close}
                >
                    Отмена
                </Button>
                <Button
                    color="success"
                    variant="contained"
                    disabled={!tag.name.trim()}
                    onClick={() => {
                        tag.color = color;
                        tag.newChildren = [...children];
                        onTagEdit();
                    }}
                >
                    Сохранить
                </Button>
            </DialogActions>
        </Dialog>
        { // todo: change parent tag
        /* <Dialog
            open={tag.mode === 'edit' && chooseParentOpen}
            onClose={() => setChooseParentOpen(false)}
        ></Dialog> */}
        <Dialog
            open={tag.mode === 'new'}
            onClose={close}
        >
            <DialogTitle align="center">Создание тега</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    label="Название тега"
                    fullWidth
                    variant="outlined"
                    value={tag.name}
                    inputProps={{ maxLength: 30 }}
                    onChange={e => setTag(prev => ({ ...prev, name: e.target.value }))}
                    sx={{ marginBottom: '16px' }}
                />
                <Stack
                    direction="row"
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mx: '8px'
                    }}
                >
                    <Typography variant="h6">Цвет тега:</Typography>
                    <ColorPicker
                        initialColor={color}
                        onChange={setColor}
                    />
                </Stack>
            </DialogContent>
            <DialogActions
                sx={{
                    display: 'flex',
                    justifyContent: 'space-evenly',
                    marginTop: '-8px',
                    marginBottom: '8px'
                }}
            >
                <Button
                    color="error"
                    onClick={close}
                >
                    Отмена
                </Button>
                <Button
                    color="success"
                    variant="outlined"
                    disabled={!tag.name.trim()}
                    onClick={() => {
                        tag.color = color;
                        onTagEdit();
                    }}
                >
                    Создать
                </Button>
            </DialogActions>
        </Dialog>
    </>;
}

export default EditTag;