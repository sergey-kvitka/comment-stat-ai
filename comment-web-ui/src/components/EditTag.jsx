import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from "@mui/material";

const EditTag = ({ tagTree, tag, onTagEdit }) => {
    return <>
        <Dialog
            open={tag && tag.id}
        >
            <DialogTitle align="center">Редактирование тега</DialogTitle>
            <DialogContent>
                <p>Тег {tag?.name}</p>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => onTagEdit('edit')}
                >
                    Применить
                </Button>
            </DialogActions>
        </Dialog>
        <Dialog
            open={tag && !tag.id}
        >
            <DialogTitle align="center">Создание тега</DialogTitle>
            <DialogContent>
                <p>Новый тег :)</p>
            </DialogContent>
            <DialogActions>
                <Button
                    color="success"
                    onClick={() => onTagEdit('create')}
                >
                    Создать
                </Button>
            </DialogActions>
        </Dialog>
    </>;
}

export default EditTag;