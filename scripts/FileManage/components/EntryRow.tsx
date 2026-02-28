import { Button, HStack, Image, Spacer, Text, VStack } from 'scripting'
import type { EntryRowProps } from '../types'

export const EntryRow = ({ entry, l10n, onCopy, onDelete, onMove, onOpenEntry, onRename }: EntryRowProps) => {
  const handlePrimaryAction = () => {
    onOpenEntry(entry)
  }

  const actionTitle = entry.isDirectory ? l10n.openFolder : l10n.previewFile
  const iconName = entry.isDirectory ? 'folder.fill' : 'doc.fill'
  const trailingIcon = entry.isDirectory ? 'chevron.right' : 'eye'

  return (
    <HStack
      frame={{ minHeight: 44 }}
      alignment="center"
      contentShape="rect"
      onTapGesture={handlePrimaryAction}
      contextMenu={{
        menuItems: (
          <VStack spacing={8}>
            <Button title={actionTitle} action={handlePrimaryAction} />
            <Button title={l10n.copy} action={() => onCopy(entry)} />
            <Button title={l10n.move} action={() => onMove(entry)} />
            <Button title={l10n.rename} action={() => onRename(entry)} />
            <Button title={l10n.delete} role="destructive" action={() => onDelete(entry)} />
          </VStack>
        )
      }}
    >
      <Image systemName={iconName} frame={{ width: 18, height: 18 }} foregroundStyle={entry.isDirectory ? 'systemBlue' : 'secondaryLabel'} />
      <Text lineLimit={1} layoutPriority={1}>
        {entry.name}
      </Text>
      <Spacer />
      <Image systemName={trailingIcon} frame={{ width: 14, height: 14 }} foregroundStyle="tertiaryLabel" />
    </HStack>
  )
}
