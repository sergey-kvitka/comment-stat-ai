import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Stack, Typography } from "@mui/material";
import { useEffect, useState } from 'react';
import ColorPicker from "./ColorPicker";

const EditTag = ({ tagTree, tag, setTag, onTagEdit }) => {

    const [color, setColor] = useState('#1565C0');

    useEffect(() => {
        if (tag?.color) setColor(tag.color);
    }, [tag]);

    if (!tag) return <></>;
    return <>
        <Dialog
            open={tag.mode === 'edit'}
            onClose={() => setTag(prev => ({ ...prev, mode: null }))}
        >
            <DialogTitle align="center">Редактирование тега</DialogTitle>
            <DialogContent>
                <p>Тег {tag.name}</p>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => onTagEdit()}
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog>
        <Dialog
            open={tag.mode === 'new'}
            onClose={() => setTag(prev => ({ ...prev, mode: null }))}
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
                    onClick={() => setTag(prev => ({ ...prev, mode: null }))}
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