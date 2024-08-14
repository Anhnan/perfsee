import { IDetailsRowProps, IDetailsRowStyles, DetailsRow, PivotItem, Link, Spinner, SpinnerSize } from '@fluentui/react'
import { NeutralColors } from '@fluentui/theme'
import { parse, stringify } from 'query-string'
import { useState, useMemo, useCallback, useContext, useEffect } from 'react'

import { TooltipWithEllipsis } from '@perfsee/components'
import { AssetInfo, ModuleTreeNode, SOURCE_CODE_PATH } from '@perfsee/shared'

import { ModuleItem, TreeView } from '../../bundle-content/treeview'
import { RouterContext } from '../../router-context'
import { ColoredSize } from '../components'
import { PackageTraceContext } from '../context'
import { TableExtraWrap, StyledPivot, StyledInfoItem } from '../style'

import { AssetFilter } from './asset-filter'
import { ModuleExplorerContainer } from './style'

type Props = {
  item: AssetInfo
  getAssetContent: (asset: AssetInfo) => Promise<ModuleTreeNode[]>
  searchText?: string
  onClickModule?: (item: ModuleItem) => void
}

const AssetModulesExplorer = (props: Props) => {
  const [content, setContent] = useState<ModuleTreeNode[] | null>(null)

  const { getAssetContent, item } = props

  useEffect(() => {
    getAssetContent(item)
      .then(setContent)
      .catch(() => {})
  }, [setContent, getAssetContent, item])

  if (!content) {
    return <Spinner size={SpinnerSize.medium} />
  }

  return (
    <ModuleExplorerContainer>
      <TreeView content={content} searchText={props.searchText} onClickItem={props.onClickModule} />
    </ModuleExplorerContainer>
  )
}

const TableExtraInfo = (props: Props) => {
  const { item } = props
  const { history, location } = useContext(RouterContext)
  const queries: { tab?: string; trace?: string } = parse(location?.search || '')
  const { setRef } = useContext(PackageTraceContext)
  const [selectKey, setSelectKey] = useState('0')

  const onLinkClick = useCallback((item?: PivotItem) => {
    if (item?.props.itemKey) {
      setSelectKey(item.props.itemKey)
    }
  }, [])

  const onClickTrace = useCallback(
    (ref: number) => () => {
      if (setRef) {
        setRef(ref)
      } else if (queries.trace !== String(ref)) {
        history?.push(`${location?.pathname}?${stringify({ ...queries, trace: ref })}`)
      }
    },
    [history, queries, location, setRef],
  )

  const [moduleSearchText, setModuleSearchText] = useState('')
  const onModulePivotRender = useCallback(
    (props?: any, defaultRenderer?: (props: any) => JSX.Element | null) => {
      return (
        <>
          {defaultRenderer?.(props)}
          {selectKey === props.itemKey ? (
            <AssetFilter searchText={moduleSearchText} onChangeSearchText={setModuleSearchText} />
          ) : null}
        </>
      )
    },
    [moduleSearchText, selectKey],
  )

  return (
    <TableExtraWrap>
      <StyledPivot
        styles={{ itemContainer: { width: '100%', padding: '8px' } }}
        selectedKey={selectKey}
        onLinkClick={onLinkClick}
      >
        <PivotItem headerText="Included packages" itemKey="0">
          {item.packages.map((pkg) => {
            if (typeof pkg === 'string') {
              return <StyledInfoItem key={pkg}>{pkg}</StyledInfoItem>
            }

            return (
              <StyledInfoItem key={pkg.path}>
                <TooltipWithEllipsis content={pkg.name + (pkg.version ? `@${pkg.version}` : '')} />
                <ColoredSize size={pkg.size} hoverable={false} />
                {pkg.path !== SOURCE_CODE_PATH ? <Link onClick={onClickTrace(pkg.ref)}>Trace</Link> : null}
              </StyledInfoItem>
            )
          })}
        </PivotItem>
        <PivotItem headerText="Modules" onRenderItemLink={onModulePivotRender} itemKey="1">
          <AssetModulesExplorer {...props} searchText={moduleSearchText} onClickModule={props.onClickModule} />
        </PivotItem>
      </StyledPivot>
    </TableExtraWrap>
  )
}

const DetailRowItem = (
  props: IDetailsRowProps & {
    getAssetContent: (asset: AssetInfo) => Promise<ModuleTreeNode[]>
    onClickModule?: (item: ModuleItem) => void
  },
) => {
  const [opened, setOpened] = useState<boolean>()

  const customStyles: Partial<IDetailsRowStyles> = useMemo(
    () => ({
      cell: {
        cursor: 'pointer',
        overflow: 'visible',
      },
      root: {
        backgroundColor: opened ? NeutralColors.gray20 : undefined,
      },
    }),
    [opened],
  )

  const onClick = useCallback(() => {
    setOpened((opened) => !opened)
  }, [])

  return (
    <>
      <DetailsRow {...props} styles={customStyles} onClick={onClick} />
      {opened && (
        <TableExtraInfo item={props.item} getAssetContent={props.getAssetContent} onClickModule={props.onClickModule} />
      )}
    </>
  )
}

export const onAssetTableRenderRow =
  (getAssetContent: (asset: AssetInfo) => Promise<ModuleTreeNode[]>, onClickModule?: (item: ModuleItem) => void) =>
  (props?: IDetailsRowProps) => {
    if (props) {
      return <DetailRowItem {...props} getAssetContent={getAssetContent} onClickModule={onClickModule} />
    }
    return null
  }
