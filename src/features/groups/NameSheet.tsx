import { useEffect, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button, Sheet, TextInput, useToast } from '@/shared/ui';
import { groupsStore } from '@/store';

/** Имя, которое видят участники групп. */
export function NameSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [name, setName] = useState(current);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(current);
  }, [open, current]);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await groupsStore.setDisplayName(name.trim());
      toast(t('groups.nameSaved'));
      onClose();
    } catch {
      toast(t('groups.errors.unknown'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('groups.nameRow')}
      subtitle={t('groups.nameHint')}
      closeLabel={t('common.close')}
      footer={
        <Button onClick={() => void save()} disabled={busy || !name.trim()}>
          {t('groups.save')}
        </Button>
      }
    >
      <TextInput
        label={t('groups.nameRow')}
        placeholder={t('groups.namePlaceholder')}
        value={name}
        maxLength={40}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />
    </Sheet>
  );
}
